const { spawn } = require("child_process");
const core = require("@actions/core");
const { getOctokit } = require("@actions/github");
const kill = require("tree-kill");

const { GITHUB_RUN_ID, GITHUB_REPOSITORY, GITHUB_TOKEN, COMMAND } = process.env;

const POLL_INTERVAL_NEW_RUN_APPERED = 15000;
const POLL_INTERVAL_OTHERS_FINISHED = 5000;

const [owner, repo] = GITHUB_REPOSITORY.split("/");

const github = getOctokit(GITHUB_TOKEN || core.getInput("github-token"));

const findFresherRunThan = (runs, that) =>
  runs.find((run) => new Date(run.created_at) > new Date(that.created_at));

const wait = (time) => new Promise((res) => setTimeout(res, time));

async function fetchRunsInProgress(workflow_id) {
  const {
    data: { workflow_runs: runsInProgress },
  } = await github.actions.listWorkflowRuns({
    owner,
    repo,
    workflow_id,
    status: "in_progress",
  });

  return runsInProgress;
}

async function fetchCurrenttRun() {
  const { data: currentRun } = await github.actions.getWorkflowRun({
    owner,
    repo,
    run_id: GITHUB_RUN_ID,
  });

  return currentRun;
}

async function fetchConcurrentRuns(workflow_id) {
  const runsInProgress = await fetchRunsInProgress(workflow_id);
  return runsInProgress.filter(({ id }) => id !== parseInt(GITHUB_RUN_ID, 10));
}

async function waitConcurrentRunsToFinish(currentRun) {
  let attempt = 0;

  while (true) {
    const concurrentRuns = await fetchConcurrentRuns(currentRun.workflow_id);
    if (!concurrentRuns.length) {
      return;
    }

    const freserRun = findFresherRunThan(concurrentRuns, currentRun);
    if (freserRun) {
      console.log(
        `Newer run has been started while waiting: ${freserRun.html_url}`
      );
      process.exit(0);
    }

    await wait(
      attempt === 0
        ? POLL_INTERVAL_NEW_RUN_APPERED
        : POLL_INTERVAL_OTHERS_FINISHED
    );

    attempt++;
  }
}

async function waitNewRunApper(currentRun) {
  while (true) {
    const concurrentRuns = await fetchConcurrentRuns(currentRun.workflow_id);
    const freserRun = findFresherRunThan(concurrentRuns, currentRun);

    if (freserRun) {
      console.log(`Found a new run: ${freserRun.html_url}`);
      return;
    }

    await wait(POLL_INTERVAL_NEW_RUN_APPERED);
  }
}

const childProcessErrorHandler = (error) => {
  console.error(error);
  core.setFailed(`Child process caused an error: ${error}`);
  process.exit(1);
};

const childProcessExitHandler = (code, signal) => {
  console.log(`Child process finished with ${signal || code}`);

  if (code !== null && code !== 0) {
    core.setFailed(`Child process finished with non-zero code: ${code}`);
  }

  process.exit(code || 0);
};

const processErrorHandler = (error) => {
  console.error(error);
  core.setFailed(`Unhandled error: ${error}`);
};

async function main() {
  const currentRun = await fetchCurrenttRun();
  await waitConcurrentRunsToFinish(currentRun);

  const command = core.getInput("command") || COMMAND;

  const child = spawn(command, [], {
    stdio: "inherit",
    shell: true,
  });

  child.on("error", childProcessErrorHandler);
  child.on("exit", childProcessExitHandler);

  await waitNewRunApper(currentRun);

  kill(child.pid, "SIGTERM");
}

process.on("unhandledRejection", processErrorHandler);
main().catch(processErrorHandler);
