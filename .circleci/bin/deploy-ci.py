#!/usr/bin/env python3

# for reservations, use this alias:
# alias reservations="${PROTOCOL_DIR}/.circleci/bin/deploy-ci.py -u ${GITHUB_USER} -g ${GITHUB_TOKEN} --dry-run -l"

import json
import logging
import shlex
import time
from pprint import pprint
from subprocess import PIPE, Popen
from threading import Thread, Timer

import click
import requests

logging.basicConfig(
    format="%(levelname)-8s [%(asctime)s] %(message)s", level=logging.INFO
)
logger = logging.getLogger("cli")


ENVIRONMENTS = ("staging", "prod")
SERVICES = ("all", "discovery", "creator", "identity")
STAGE_CREATOR_NODES = (
    "stage-creator-5",
    "stage-creator-6",
    "stage-creator-7",
    "stage-creator-8",
    "stage-creator-9",
    "stage-creator-10",
    "stage-creator-11",
    "stage-user-metadata",
)
PROD_CREATOR_NODES = (
    "prod-creator-1",
    "prod-creator-2",
    "prod-creator-3",
    "prod-creator-4",  # prod-canary
    "prod-creator-5",
    "prod-user-metadata",
)
CREATOR_NODES = STAGE_CREATOR_NODES + PROD_CREATOR_NODES

STAGE_DISCOVERY_NODES = (
    "stage-discovery-1",
    "stage-discovery-2",
    "stage-discovery-3",
    "stage-discovery-4",  # canary
    "stage-discovery-5",
)
PROD_DISCOVERY_NODES = (
    "prod-discovery-1",
    "prod-discovery-2",
    "prod-discovery-3",
    "prod-discovery-4",  # prod-canary
)
DISCOVERY_NODES = STAGE_DISCOVERY_NODES + PROD_DISCOVERY_NODES

STAGE_IDENTITY_NODES = ("stage-identity",)
PROD_IDENTITY_NODES = ("prod-identity",)
IDENTITY_NODES = STAGE_IDENTITY_NODES + PROD_IDENTITY_NODES

ALL_NODES = CREATOR_NODES + DISCOVERY_NODES + IDENTITY_NODES
CANARIES = (
    "stage-discovery-4",  # canary
    "prod-creator-4",  # prod-canary
    "prod-discovery-4",  # prod-canary
)

MAIN = "main"
MISSING = "missing"
RELEASE = "release"
FAILED_TO_SSH = "failed_to_ssh"
PRE_DEPLOY = "pre_deploy"
POST_DEPLOY = "post_deploy"

RAISE = "raise"
EXIT_1 = "exit-1"
IGNORE = "ignore"


def get_service_from_host(host):
    """Helper to detect the audius-cli service target."""

    if host in CREATOR_NODES:
        return "creator-node"
    if host in DISCOVERY_NODES:
        return "discovery-provider"
    if host in IDENTITY_NODES:
        return "identity-service"


def ssh(
    host,
    cmd,
    exit_on_error=RAISE,
    show_output=False,
    dry_run=False,
    timeout_sec=120,
):
    """Helper for `run_cmd()` designed for running commands on a host via SSH."""

    ssh_cmd = f"ssh -o LogLevel=quiet {host} -- {cmd}"
    if dry_run:
        logger.info(f"Dry run: {ssh_cmd}")
    else:
        return run_cmd(
            ssh_cmd,
            msg=f">> {host}: {cmd}",
            exit_on_error=exit_on_error,
            show_output=show_output,
            timeout_sec=timeout_sec,
        )


def run_cmd(
    cmd,
    exit_on_error=RAISE,
    msg=None,
    show_output=False,
    show_stderr=True,
    timeout_sec=120,
):
    """
    Execute a shell command and return stdout.
    Exit, raise error, or ignore on stderr.
    """

    # set the appropriate log level
    log = logger.debug
    if show_output:
        log = logger.info

    # run command and grab stdout/stderr
    log(msg if msg else f"< {cmd}")
    proc = Popen(shlex.split(cmd), stdout=PIPE, stderr=PIPE)
    timer = Timer(timeout_sec, proc.kill)
    try:
        timer.start()
        stdout, stderr = proc.communicate()
    finally:
        timer.cancel()
    stdout = stdout.strip().decode()
    stderr = stderr.strip().decode()

    # log stdout
    if stdout:
        log(stdout)

    # log stderr
    # or exit(1), raise error, or pass
    if stderr:
        if show_stderr:
            logger.warning(stderr)
        if "Could not get object for" in stderr:
            log("REASON: Branch was deleted.")
        if exit_on_error == RAISE:
            raise RuntimeError("Previous command had stderr output.")
        elif exit_on_error == EXIT_1:
            exit(1)
        else:
            pass

    return stdout


def standardize_branch_name(branches):
    """Helper to sanatize branch names into enums, when possible"""

    for branch in branches:
        if "origin/main" in branch or "origin/HEAD" in branch:
            return MAIN
        if "origin/release" in branch:
            return RELEASE
    return branch


def get_release_tag_by_host(snapshot, host, github_user, github_token):
    """
    Collect metadata for current release tag, given a host.

    A release tag can either be:

    * in the `main` branch
    * in a `release` branch
    * in a feature/PR branch
        * In which case, we'll collect author and commit_data metadata.
    * an unknown commit (due to previously squashing and merging a feature branch)
        * In which case, we'll collect author, commit_data, branch, and Github URL metadata.
    """

    # test ssh access
    output = ssh(host, "hostname", exit_on_error=RAISE, timeout_sec=15)
    if not output:
        snapshot.update(
            {
                host: {
                    "branch": FAILED_TO_SSH,
                    "tag": FAILED_TO_SSH,
                }
            }
        )
        logger.error(f"{host} not accessible via SSH")
        return

    # grab release tag from host
    output = ssh(host, "grep TAG audius-docker-compose/*/.env", exit_on_error=RAISE)
    tag = output.split()[0].split("=")[1].strip("'")

    # grab all branches from git tree that contain release tag
    try:
        branches = run_cmd(f"git branch -r --contains {tag}", show_stderr=False)
        branches = branches.split("\n")
    except Exception:
        logger.debug(f"{tag} not found in known branches")
        branches = [MISSING]

    branch = standardize_branch_name(branches)

    # snapshot.update() is thread-safe, other interactions may not be
    snapshot.update(
        {
            host: {
                "branch": branch,
                "tag": tag,
            }
        }
    )

    # grab author and commit date from git tree for deployed feature-branches
    if branch not in (MAIN, RELEASE, MISSING):
        author, commit_date = run_cmd(f"git log --format='%an|%ci' {tag}^!").split("|")
        snapshot.update(
            {
                host: {
                    "author": author,
                    "commit_date": commit_date,
                    "branch": branch,
                    "tag": tag,
                }
            }
        )

    # grab author, commit date, and url metadata from Github
    # ...when branches have been merged and deleted
    if branch == MISSING:
        # retry 3 times, then continue (in case Github is down)
        for _ in range(3):
            try:
                r = requests.get(
                    f"https://api.github.com/repos/AudiusProject/audius-protocol/git/commits/{tag}",
                    headers={
                        "Accept": "application/vnd.github+json",
                    },
                    auth=(github_user, github_token),
                    timeout=5,
                )
            except:
                continue

            r = r.json()
            snapshot.update(
                {
                    host: {
                        "author": r["author"]["name"],
                        "branch": branch,
                        "commit_date": r["author"]["date"],
                        "tag": tag,
                        "url": r["html_url"],
                    }
                }
            )
            break


def release_snapshot(deploy_list, parallel_mode, github_user, github_token):
    """
    Grab the current release tags across all hosts in a `deploy_list`.

    `parallel_mode` can be disabled for simpler debugging.
    """

    snapshot = {}

    # create a thread per host, for async release-tag collection
    threads = list()
    for host in deploy_list:
        thread = Thread(
            target=get_release_tag_by_host,
            args=(snapshot, host, github_user, github_token),
        )
        threads.append(thread)
        thread.start()

        # allow sequentially running commands for debug purposes
        if not parallel_mode:
            thread.join(timeout=15)
            if thread.is_alive():
                print("Timeout likely seen with Github API.")

    # required for parallel_mode
    # no-op for non-parallel mode, since thread.join() has already been called above
    for thread in threads:
        thread.join(timeout=15)
        if thread.is_alive():
            print("Timeout likely seen with Github API.")

    return snapshot


def update_release_summary(
    release_summary,
    release_step,
    parallel_mode=True,
    github_user=None,
    github_token=None,
    force=False,
):
    """
    Save current snapshot of release tags.

    When in PRE_DEPLOY mode, mark nodes as:

    * `upgradeable`, when a node is currently using a githash found in `main` or a `release` branch.
    * `skipped`, when a node has been manually deployed to.
    """

    release_summary[release_step] = release_snapshot(
        release_summary["deploy_list"], parallel_mode, github_user, github_token
    )

    if release_step == PRE_DEPLOY:
        release_summary["upgradeable"] = []
        release_summary["skipped"] = {}
        release_summary[FAILED_TO_SSH] = []
        for host, metadata in release_summary[release_step].items():
            if metadata["branch"] in (MAIN, RELEASE) or force:
                release_summary["upgradeable"].append(host)
            elif metadata["branch"] == FAILED_TO_SSH:
                release_summary[FAILED_TO_SSH].append(host)
            else:
                release_summary["skipped"][host] = metadata
        release_summary["upgradeable"].sort()
        for canary in CANARIES:
            if canary in release_summary["upgradeable"]:
                release_summary["upgradeable"].remove(canary)
                release_summary["upgradeable"].insert(0, canary)


def print_release_summary(release_summary):
    """
    Helper to print a release summary.

    Dedicate error logs when `failed` releases are encountered.
    """

    print("=" * 40)
    pprint(release_summary, sort_dicts=True)

    if "failed" in release_summary and release_summary["failed"]:
        print("=" * 40)
        logging.error("Failed:")
        logging.error("See logs for the following failed hosts:")
        pprint(release_summary["failed"], sort_dicts=True)


def generate_deploy_list(environment, services, hosts):
    """Create a set of hosts to be deployed to, given possibly conflicting CLI parameters."""

    deploy_list = []
    for service in services:
        if service in ["all", "creator"]:
            if environment == "prod":
                deploy_list += PROD_CREATOR_NODES
            else:
                deploy_list += STAGE_CREATOR_NODES
        if service in ["all", "discovery"]:
            if environment == "prod":
                deploy_list += PROD_DISCOVERY_NODES
            else:
                deploy_list += STAGE_DISCOVERY_NODES
        if service in ["all", "identity"]:
            if environment == "prod":
                deploy_list += PROD_IDENTITY_NODES
            else:
                deploy_list += STAGE_IDENTITY_NODES

    # make sure hosts is not a superset of deploy_list
    for host in hosts:
        if host not in deploy_list:
            logger.error(f"'{host}' not found within service nodes for '{service}'")
            logger.error("Did you mean to use both -s and -h?")
            exit(1)

    # only deploy the subset of hosts
    if hosts:
        deploy_list = hosts

    return deploy_list


def format_artifacts(
    heading=None, hosts=None, release_summary=None, list_reservations=False
):
    """Send summary output to stdout and /tmp/summary.md|json for artifact collection."""

    # write summary.md
    if hosts:
        hosts.sort()
        summary = [f"{heading}:"]
        if "Upgraded to" in heading:
            summary.append(", ".join(hosts))
        else:
            for h in hosts:
                summary.append(f"• {h}")

        print("\n".join(summary))
        with open("/tmp/summary.md", "a") as f:
            f.write("\n".join(summary))
            f.write("\n\n")

    # write summary.json
    if release_summary:
        with open("/tmp/summary.json", "w") as f:
            f.write(json.dumps(release_summary, indent=4))

    if list_reservations:
        hosts = list(release_summary[PRE_DEPLOY].keys())
        hosts.sort()

        # display reservation list
        click.clear()
        with open("/tmp/summary.md", "a") as f:
            f.write("test Reservation List:\n```\n")
            for h in hosts:
                host = release_summary[PRE_DEPLOY][h]
                tag = host["tag"][:7]
                branch = host["branch"]
                if "author" in host:
                    owner = host["author"]
                    fg = "reset"
                else:
                    owner = host["branch"]
                    if owner == MAIN:
                        fg = "green"
                    elif owner == FAILED_TO_SSH:
                        fg = "red"
                    else:
                        fg = "yellow"

                output = f"{h.ljust(25)}{owner.ljust(20)}{tag.ljust(10)}{branch}"
                click.echo(click.style(output, fg=fg))
                f.write(f"{output}\n")
            f.write("```\n\n")


@click.command()
@click.option("-u", "--github-user", required=True)
@click.option("-g", "--github-token", required=True)
@click.option("-t", "--git-tag", required=False)
@click.option(
    "-f",
    "--force",
    is_flag=True,
    default=False,
    help="Deploy over nodes running feature branches",
)
@click.option(
    "-e", "--environment", type=click.Choice(ENVIRONMENTS, case_sensitive=False)
)
@click.option(
    "-s",
    "--services",
    type=click.Choice(SERVICES),
    required=False,
    default=("all",),
    multiple=True,
)
@click.option(
    "-h", "--hosts", type=click.Choice(ALL_NODES), required=False, multiple=True
)
@click.option(
    "--parallel-mode/--no-parallel-mode",
    " /-P",
    show_default=True,
    default=True,
)
@click.option(
    "-d",
    "--dry-run",
    is_flag=True,
    default=False,
)
@click.option(
    "-l",
    "--list-reservations",
    is_flag=True,
    default=False,
)
def cli(
    github_user,
    github_token,
    git_tag,
    force,
    environment,
    services,
    hosts,
    parallel_mode,
    dry_run,
    list_reservations,
):
    """
    Deploy a git_tag (defaults to latest `main` commit when unspecified)
    across a combination of: environments, services, and hosts.
    """

    if not git_tag:
        # use the tip of `main`
        git_tag = run_cmd("git log -n 1 --pretty=format:%H main")

    # gather and display current release state, pre-deploy
    release_summary = {
        "deploy_list": generate_deploy_list(environment, services, hosts),
        "git_tag": git_tag,
    }
    update_release_summary(
        release_summary,
        PRE_DEPLOY,
        parallel_mode=parallel_mode,
        github_user=github_user,
        github_token=github_token,
        force=force,
    )

    # exit early for reservation listing
    if list_reservations:
        format_artifacts(
            release_summary=release_summary, list_reservations=list_reservations
        )
        exit()

    print_release_summary(release_summary)

    # perform release on `upgradeable` hosts
    print("v" * 40)
    release_summary["upgraded"] = []
    release_summary["failed_pre_check"] = []
    release_summary["failed_post_check"] = []
    release_summary["failed"] = []
    for host in release_summary["upgradeable"]:
        try:
            # log additional information
            ssh(host, "hostname", show_output=True)
            ssh(
                host,
                "cd audius-docker-compose; git log -n 1 --pretty=format:%H",
                show_output=True,
            )

            # check healthcheck pre-deploy
            service = get_service_from_host(host)
            health_check = ssh(
                host, f"audius-cli health-check {service}", show_output=True
            )
            health_check = health_check.split("\n")[-1]
            if health_check != "Service is healthy":
                release_summary["failed_pre_check"].append(host)

            # perform release
            # NOTE: `git pull` and `docker pull` write to stderr,
            # so we can't readily catch "errors"
            ssh(
                host,
                "yes | audius-cli pull",
                show_output=True,
                exit_on_error=IGNORE,
                dry_run=dry_run,
            )
            ssh(
                host,
                f"yes | audius-cli set-tag {git_tag}",
                show_output=True,
                dry_run=dry_run,
            )
            ssh(
                host,
                f"yes | audius-cli launch {service}",
                show_output=True,
                exit_on_error=IGNORE,
                dry_run=dry_run,
            )

            if environment == "prod":
                # check healthcheck post-deploy
                wait_time = time.time() + (30 * 60)
                if len(release_summary["upgradeable"]) == 1:
                    wait_time = time.time() + (1 * 60)
                while time.time() < wait_time:
                    # throttle the amount of logs and request load during startup
                    time.sleep(30)

                    # this resets on each loop since we only care about the last run
                    failed_post_check = False

                    health_check = ssh(
                        host, f"audius-cli health-check {service}", show_output=False
                    )
                    health_check = health_check.split("\n")[-1]
                    logger.info(f"{host}: health_check: {health_check}")

                    if health_check != "Service is healthy":
                        failed_post_check = True

            release_summary["upgraded"].append(host)

            if environment == "prod":
                # if the post-check fails, add it to the above `upgraded` list,
                # but end the release early
                if failed_post_check:
                    release_summary["failed_post_check"].append(host)
                    break
        except:
            release_summary["failed"].append(host)
        print("-" * 40)
    print("^" * 40)

    # gather and display current release state, post-deploy
    update_release_summary(
        release_summary,
        POST_DEPLOY,
        parallel_mode=parallel_mode,
        github_user=github_user,
        github_token=github_token,
    )
    print_release_summary(release_summary)

    # save release states as artifacts
    format_artifacts("Failed to SSH", release_summary[FAILED_TO_SSH])
    format_artifacts("Failed precheck (unhealthy)", release_summary["failed_pre_check"])
    format_artifacts(
        "Failed postcheck (unhealthy)", release_summary["failed_post_check"]
    )
    format_artifacts(
        f"Upgraded to `{git_tag if git_tag else 'main'}`",
        release_summary["upgraded"],
    )
    format_artifacts("Failed to Deploy", release_summary["failed"])
    format_artifacts(release_summary=release_summary)

    # report back to CircleCI that this deployment has failed
    if (
        release_summary["failed_post_check"]
        or release_summary[FAILED_TO_SSH]
        or release_summary["failed"]
    ):
        exit(1)


if __name__ == "__main__":
    cli()
