from preloaded import *
import logging

log = logging.getLogger(__name__)


class CreateUserProfile:
    @staticmethod
    def before_create(email):
        # Letting fetch raise naturally — the framework will log + 500 it,
        # which is the existing behavior. We just want to stop save_profiles
        # and the result-shape access from being hidden sources of 500s.
        profiles = SocialMediaProfiles.fetch_social_profiles(email)

        if profiles is None:
            log.warning("fetch_social_profiles returned None for %s", email)
            return False

        try:
            result = SocialMediaProfiles.save_profiles(profiles)
        except Exception:
            log.exception(
                "save_profiles failed for %s; profiles=%r", email, profiles
            )
            raise

        if not isinstance(result, dict) or "success" not in result:
            log.error(
                "save_profiles returned unexpected shape for %s: %r",
                email,
                result,
            )
            return False

        return result["success"]