const core = require("@actions/core");
const { getOctokit } = require("@actions/github");

process.on("unhandledRejection", handleError);
main().catch(handleError);

async function main() {
  const { GITHUB_RUN_ID, GITHUB_REPOSITORY, GITHUB_TOKEN } = process.env;
  const [owner, repo] = GITHUB_REPOSITORY.split("/");

  const github = getOctokit(GITHUB_TOKEN);

  const { data: currentRun } = await github.actions.getWorkflowRun({
    owner,
    repo,
    run_id: GITHUB_RUN_ID,
  });

  const {
    data: { workflow_runs: runsInProgress },
  } = await github.actions.listWorkflowRuns({
    owner,
    repo,
    workflow_id: currentRun.workflow_id,
    status: "in_progress",
  });

  const concurrentRuns = runsInProgress.filter(
    ({ id }) => id !== parseInt(GITHUB_RUN_ID, 10)
  );

  if (!concurrentRuns.length) {
    return;
  }

  const fresherRun = concurrentRuns.find(
    (run) => new Date(run.created_at) > new Date(currentRun.created_at)
  );

  if (fresherRun) {
    core.setFailed(`There's already a newer task running: ${fresherRun.id}`);
  }

  const cancelledRuns = await Promise.all(
    concurrentRuns.map((run) =>
      github.actions.cancelWorkflowRun({
        owner,
        repo,
        run_id: run.id,
      })
    )
  );
}

function handleError(err) {
  console.error(err);
  core.setFailed(`Unhandled error: ${err}`);
}
