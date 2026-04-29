import os
import sys
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError


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

    print("Checking S3 access...")
    try:
        resp = client.list_buckets()
        names = [b.get("Name", "") for b in resp.get("Buckets", [])]
        print(f"Visible buckets ({len(names)}): {names}")
    except ClientError as exc:
        print("list_buckets failed")
        print(f"Code: {exc.response.get('Error', {}).get('Code')}")
        print(f"Message: {exc.response.get('Error', {}).get('Message')}")
        sys.exit(2)

    print(f"Checking bucket: {bucket}")
    try:
        client.head_bucket(Bucket=bucket)
        print("SUCCESS: bucket exists and is accessible")
    except ClientError as exc:
        print("head_bucket failed")
        print(f"Code: {exc.response.get('Error', {}).get('Code')}")
        print(f"Message: {exc.response.get('Error', {}).get('Message')}")
        sys.exit(3)


if __name__ == "__main__":
    main()
