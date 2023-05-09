#!/usr/bin/env bats

setup() {
    load 'common-setup'
    _common_setup
}

@test "should create random user when called without args" {
    run timeout 120s npm run audius-cmd -- create-user

    assert_success
    assert_line "Successfully created user!"
}

@test "should create user with specified args" {
    TEST_HANDLE="test-user-handle-$RANDOM"
    TEST_EMAIL="$TEST_HANDLE@audius.co"

    run timeout 120s npm run audius-cmd -- create-user "$TEST_HANDLE" --email "$TEST_EMAIL" --password "test-password"

    assert_success
    assert_line "Successfully created user!"
    assert_line "Handle:    $TEST_HANDLE"
    assert_line "Email:     $TEST_EMAIL"
    assert_line "Password:  test-password"
}
