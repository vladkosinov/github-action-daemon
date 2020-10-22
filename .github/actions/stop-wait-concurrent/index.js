const core = require("@actions/core");
const { getOctokit } = require("@actions/github");

process.on("unhandledRejection", handleError);
main().catch(handleError);

async function main() {
  const github = getOctokit(process.env.GITHUB_TOKEN);

  const { data: currentRun } = await github.actions.getWorkflowRun({
    owner: process.env.OWNER,
    repo: process.env.REPO,
    run_id: process.env.GITHUB_RUN_ID,
  });

  const {
    data: { workflow_runs: runsInProgress },
  } = await github.actions.listWorkflowRuns({
    owner: process.env.OWNER,
    repo: process.env.REPO,
    workflow_id: currentRun.workflow_id,
    status: "in_progress",
  });

  const concurrentRuns = runsInProgress.filter(
    ({ id }) => id !== GITHUB_RUN_ID
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

  await Promise.all(
    concurrentRuns.map((run) =>
      github.actions.cancelWorkflowRun({
        owner: process.env.OWNER,
        repo: process.env.REPO,
        run_id: run.id,
      })
    )
  );
}

function handleError(err) {
  console.error(err);
  core.setFailed(`Unhandled error: ${err}`);
}
