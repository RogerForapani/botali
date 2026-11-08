#!/usr/bin/env python3
"""Read only check of the Botali Storage S3 credential received on stdin."""

import json
import sys

import boto3
from botocore.config import Config


def main() -> None:
    config = json.load(sys.stdin)
    client = boto3.client(
        "s3",
        region_name=config["s3_region"],
        endpoint_url="https://phsvoeljsaksglqrpstm.storage.supabase.co/storage/v1/s3",
        aws_access_key_id=config["s3_key_id"],
        aws_secret_access_key=config["s3_secret"],
        config=Config(s3={"addressing_style": "path"}, retries={"max_attempts": 3}),
    )
    buckets = client.list_buckets()["Buckets"]
    objects = 0
    for bucket in buckets:
        for page in client.get_paginator("list_objects_v2").paginate(Bucket=bucket["Name"]):
            objects += len(page.get("Contents", []))
    print(f"Storage S3 acessível; {len(buckets)} bucket(s), {objects} objeto(s) listados.")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Falha no teste S3: {type(error).__name__}", file=sys.stderr)
        sys.exit(1)
