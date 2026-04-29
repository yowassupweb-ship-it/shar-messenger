import os
from typing import Any, Dict, Optional

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError


def _as_bool(value: Optional[str]) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


class S3Storage:
    def __init__(self) -> None:
        self.enabled = _as_bool(os.getenv("S3_ENABLED"))
        self.endpoint = os.getenv("S3_ENDPOINT", "https://storage.yandexcloud.net")
        self.region = os.getenv("S3_REGION", "ru-central1")
        self.bucket = os.getenv("S3_BUCKET", "").strip()
        self._client = None

        if not self.enabled:
            return

        access_key = os.getenv("S3_ACCESS_KEY", "").strip()
        secret_key = os.getenv("S3_SECRET_KEY", "").strip()
        if not self.bucket or not access_key or not secret_key:
            self.enabled = False
            return

        self._client = boto3.client(
            "s3",
            endpoint_url=self.endpoint,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=self.region,
            config=Config(signature_version="s3v4"),
        )

    def upload_fileobj(self, file_obj, key: str, content_type: Optional[str] = None) -> int:
        if not self.enabled or self._client is None:
            raise RuntimeError("S3 storage is not enabled")

        put_kwargs: Dict[str, Any] = {
            "Bucket": self.bucket,
            "Key": key,
            "Body": file_obj,
        }
        if content_type:
            put_kwargs["ContentType"] = content_type

        self._client.put_object(**put_kwargs)
        head = self._client.head_object(Bucket=self.bucket, Key=key)
        return int(head.get("ContentLength", 0))

    def get_object(self, key: str) -> Optional[Dict[str, Any]]:
        if not self.enabled or self._client is None:
            return None

        try:
            return self._client.get_object(Bucket=self.bucket, Key=key)
        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code")
            if code in {"NoSuchKey", "404", "NotFound"}:
                return None
            raise

    def delete_prefix(self, prefix: str) -> int:
        if not self.enabled or self._client is None:
            return 0

        paginator = self._client.get_paginator("list_objects_v2")
        deleted = 0
        for page in paginator.paginate(Bucket=self.bucket, Prefix=prefix):
            objects = page.get("Contents", [])
            if not objects:
                continue
            payload = {"Objects": [{"Key": obj["Key"]} for obj in objects]}
            self._client.delete_objects(Bucket=self.bucket, Delete=payload)
            deleted += len(objects)
        return deleted
