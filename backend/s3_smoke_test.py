import os
import sys
import boto3
from botocore.client import Config


def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        print(f"Missing required environment variable: {name}")
        sys.exit(1)
    return value


def main() -> None:
    endpoint = require_env("S3_ENDPOINT")
    region = os.getenv("S3_REGION", "ru-central1")
    bucket = require_env("S3_BUCKET")
    access_key = require_env("S3_ACCESS_KEY")
    secret_key = require_env("S3_SECRET_KEY")

    client = boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=region,
        config=Config(signature_version="s3v4"),
    )

    key = "healthcheck/test.txt"
    body = b"ok"

    client.put_object(
        Bucket=bucket,
        Key=key,
        Body=body,
        ContentType="text/plain",
    )

    response = client.get_object(Bucket=bucket, Key=key)
    content = response["Body"].read().decode("utf-8")

    if content != "ok":
        print(f"Unexpected content: {content!r}")
        sys.exit(2)

    print("ok")
    print("SUCCESS: S3 upload and read are working")


if __name__ == "__main__":
    main()
