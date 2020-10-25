const { getOctokit } = require("@actions/github");

function handleError(err) {
  console.error(err);
  process.exit(1);
}

const { GITHUB_RUN_ID, GITHUB_REPOSITORY, GITHUB_TOKEN } = process.env;
const { POLL_INTERVAL = 1000 } = process.env;

const [owner, repo] = GITHUB_REPOSITORY.split("/");
const github = getOctokit(GITHUB_TOKEN);

const slepp = () => new Promise((res) => setTimeout(res, POLL_INTERVAL));

const fetchRunsInProgress = async (workflow_id) => {
  const {
    data: { workflow_runs: runsInProgress },
  } = await github.actions.listWorkflowRuns({
    owner,
    repo,
    workflow_id,
    status: "in_progress",
  });

  return runsInProgress;
};

async function main() {
  const { data: currentRun } = await github.actions.getWorkflowRun({
    owner,
    repo,
    run_id: GITHUB_RUN_ID,
  });

  while (true) {
    const runsInProgress = await fetchRunsInProgress(currentRun.workflow_id);
    const concurrentRuns = runsInProgress.filter(
      ({ id }) => id !== parseInt(GITHUB_RUN_ID, 10)
    );
    

    const fresherRun = concurrentRuns.find(
      (run) => new Date(run.created_at) > new Date(currentRun.created_at)
    );

    if (fresherRun) {
      console.log(`Found a fresher run ${fresherRun.id}, exiting with code 1`);
      process.exit(1);
    }

    if (!concurrentRuns.length) {
      console.log(`No concurent runs, exiting`);
      return;
    }

    console.log(`Waiting concurrent runs ${concurrentRuns.map(run => run.id).join(', ')} to finish`);

    await slepp();
  }
}

process.on("unhandledRejection", handleError);
main().catch(handleError);
