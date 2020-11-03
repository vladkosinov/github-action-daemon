# github-action-daemon

Runs a given `command` and handles its restarts:

- waits for the finish of all other runs of the same workflow before starting the command
- sends `SIGTERM` to the running `command` once a new run appear

## Inputs

### `command`

**Required** The command to run

### `github-token` [optional]

Used to poll GitHub API for statuses of the same workflow that running the daeomn. Default: `${{ github.token }}`


## Motivation

To test services manually or run live repo examples

## Example usage

### Running telegram bot
Example repo: [github-action-daemon-example-telegram-bot](https://github.com/vladkosinov/github-action-daemon-example-telegram-bot)

```yml
name: Daemon demo
on:
  push:
    branches:
      - main
  schedule:
    # # # # # # # # # #
    # restart each 1 hour
    - cron: "0 */1 * * *"
    # # # # # # # # # # 

jobs:
  start:
    runs-on: ubuntu-latest
    name: Start daemon
    steps:
      - uses: actions/checkout@v2

      - uses: vladkosinov/github-action-daemon@v1.0.0
        env:
          BOT_TOKEN: ${{ secrets.BOT_TOKEN }}
        with:
          command: "node .github/workflows/demo/index.js"
```

### Running docker-compose bot and exposing URL
Example repo: [github-action-daemon-example-docker-compose](https://github.com/vladkosinov/github-action-daemon-example-docker-compose)

```yml
name: Running
on:
  push:
    branches:
      - main
  schedule:
    - cron: "0 */1 * * *"

jobs:
  start:
    runs-on: ubuntu-latest
    name: Start

    steps:
      - uses: actions/checkout@v2

      - uses: actions/checkout@v2
        with:
          repository: 'docker/awesome-compose'
          path: 'awesome-compose'
      
      - uses: vladkosinov/github-action-daemon@v1.0.0
        with:
          command: |
            #
            # localtunnel-live.sh creates tunnel and pushes URL to the README.md
            # https://github.com/vladkosinov/github-action-daemon-example-docker-compose/blob/main/localtunnel-live.sh
            #
            ./localtunnel-live.sh & (cd awesome-compose/react-rust-postgres && docker-compose up)
```
