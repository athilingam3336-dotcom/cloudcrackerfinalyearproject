import logging
import os
import sys


def setup_logging():
    """Sets up global application logging."""
    log_format = "%(asctime)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s"

    # Make sure logs directory exists
    logs_dir = os.path.join(os.getcwd(), "logs")
    os.makedirs(logs_dir, exist_ok=True)
    log_file = os.path.join(logs_dir, "app.log")

    # Set root logger configuration
    logging.basicConfig(
        level=logging.INFO,
        format=log_format,
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler(log_file, encoding="utf-8"),
        ],
    )

    # Disable or raise log levels for overly verbose libraries
    logging.getLogger("motor").setLevel(logging.WARNING)
    logging.getLogger("beanie").setLevel(logging.INFO)


logger = logging.getLogger("app")
