import logging
import time
from typing import Dict


class StructuredLogger:
    def __init__(self, name):
        self.logger = logging.getLogger(name)
        self.context: Dict = {}

    def set_context(self, key: str, value):
        self.context[key] = value

    def get_context(self):
        return {
            "path": self.logger.name,
            **self.context,
        }

    def reset_context(self):
        self.context = {}

    def reset_context(self, key):  # noqa: F811
        if key in self.context:
            self.context.pop(key)

    def info(self, message, *args, **kwargs):
        kwargs["extra"] = self.get_context()  # Set the updated extra context
        self.logger.info(
            message, *args, **kwargs
        )  # Call the original logger.info method

    def error(self, message, *args, **kwargs):
        kwargs["extra"] = self.get_context()  # Set the updated extra context
        self.logger.error(
            message, *args, **kwargs
        )  # Call the original logger.info method

    def debug(self, message, *args, **kwargs):
        kwargs["extra"] = self.get_context()  # Set the updated extra context
        self.logger.debug(
            message, *args, **kwargs
        )  # Call the original logger.info method

    def warn(self, message, *args, **kwargs):
        kwargs["extra"] = self.get_context()  # Set the updated extra context
        self.logger.warn(
            message, *args, **kwargs
        )  # Call the original logger.info method

    def warning(self, message, *args, **kwargs):
        kwargs["extra"] = self.get_context()  # Set the updated extra context
        self.logger.warning(
            message, *args, **kwargs
        )  # Call the original logger.info method


def log_duration(logger: StructuredLogger):
    """
    Decorator to log the duration of function execution.
    """

    def decorator(func):
        def wrapper(*args, **kwargs):
            logger.set_context("function", func.__name__)
            start_time = time.time()
            result = func(*args, **kwargs)
            end_time = time.time()
            duration = end_time - start_time
            logger.set_context("duration", duration)
            logger.info(f"{func.__name__} completed in {duration}")
            logger.reset_context("duration")
            return result

        return wrapper

    return decorator
