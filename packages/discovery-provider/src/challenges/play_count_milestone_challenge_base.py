from datetime import datetime
from typing import Dict, List, Optional, cast

from sqlalchemy import and_, func
from sqlalchemy.orm.session import Session

from src.challenges.challenge import ChallengeUpdater, FullEventMetadata
from src.models.rewards.user_challenge import UserChallenge
from src.models.social.play import Play
from src.models.tracks.track import Track


class PlayCountMilestoneUpdaterBase(ChallengeUpdater):
    """
    Base class for play count milestone challenges.
    Shared functionality for all play count milestone challenges.
    """

    # To be overridden by subclasses
    MILESTONE = 0
    REWARD_AMOUNT = 0
    CHALLENGE_ID = ""
    PREVIOUS_MILESTONE_CHALLENGE_ID = ""

    def _get_user_play_count_2025(self, session: Session, user_id: int) -> int:
        """Get the total play count for an artist's tracks in 2025 and beyond"""
        start_date = datetime(2025, 1, 1)

        play_count = (
            session.query(func.count(Play.id))
            .join(
                Track,
                and_(
                    Track.track_id == Play.play_item_id,
                    Track.owner_id == user_id,
                    Track.is_current == True,
                    Track.is_delete == False,
                ),
            )
            .filter(Play.created_at >= start_date)
            .scalar()
        )

        return cast(int, play_count)

    def update_user_challenges(
        self,
        session: Session,
        event: str,
        user_challenges: List[UserChallenge],
        step_count: Optional[int],
        event_metadatas: List[FullEventMetadata],
        starting_block: Optional[int],
    ):
        """
        Update user challenges based on their play count milestone.
        This method is called by the ChallengeManager when processing events.
        """
        for user_challenge in user_challenges:
            user_id = user_challenge.user_id
            play_count = self._get_user_play_count_2025(session, user_id)

            user_challenge.current_step_count = play_count

            if play_count >= self.MILESTONE:
                user_challenge.amount = self.REWARD_AMOUNT
                user_challenge.is_complete = True

    def generate_specifier(self, session: Session, user_id: int, extra: Dict) -> str:
        """
        Generate a unique specifier for the user's challenge.
        Format: hex_user_id_MILESTONE
        """
        return f"{hex(user_id)[2:]}_{self.MILESTONE}"

    def should_create_new_challenge(
        self, session: Session, event: str, user_id: int, extra: Dict
    ) -> bool:
        """
        Determine if a new challenge should be created for the user.

        Create a new challenge if:
        1. The user has played tracks in 2025
        2. The user hasn't already completed this milestone
        3. If there's a previous milestone, the user has completed it
        """
        # Only proceed if they've played tracks in 2025
        play_count = self._get_user_play_count_2025(session, user_id)
        if play_count <= 0:
            return False

        # If there's a previous milestone, check if it's completed
        if self.PREVIOUS_MILESTONE_CHALLENGE_ID:
            previous_milestone_completed = (
                session.query(UserChallenge)
                .filter(
                    UserChallenge.challenge_id == self.PREVIOUS_MILESTONE_CHALLENGE_ID,
                    UserChallenge.user_id == user_id,
                    UserChallenge.is_complete == True,
                )
                .first()
            ) is not None

            if not previous_milestone_completed:
                return False

        # Check if they already have this challenge
        existing_challenge = (
            session.query(UserChallenge)
            .filter(
                UserChallenge.challenge_id == self.CHALLENGE_ID,
                UserChallenge.user_id == user_id,
            )
            .first()
        )

        # If they already have the challenge and it's complete, don't create a new one
        if existing_challenge and existing_challenge.is_complete:
            return False

        return True
