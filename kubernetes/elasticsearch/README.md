After you deploy this chart you will have to do the following
1) Add one log to the database:
```
    curl -X POST -k \
      -u elastic:<elastic-password> \
      https://elasticsearch.postrix.io/logs-2025.05.08/_doc \
      -H "Content-Type: application/json" \
      -d '{
        "message": "This is a test log message",
        "service": "test-application",
        "level": "log",
        "hostname": "my-test-host",
        "@timestamp": "2025-05-08T18:30:45.123Z"
      }'
```

2) Create a Data View. Name it "App" and name the index-pattern to "logs-*"
3) Search for the log in the discover page to see if it worked