const core = require("@actions/core");
const { getOctokit } = require("@actions/github");

process.on("unhandledRejection", handleError);
main().catch(handleError);

async function main() {
  const { GITHUB_RUN_ID, OWNER, REPO, GITHUB_TOKEN } = process.env;

  const github = getOctokit(GITHUB_TOKEN);

  const { data: currentRun } = await github.actions.getWorkflowRun({
    owner: OWNER,
    repo: REPO,
    run_id: GITHUB_RUN_ID,
  });

  const {
    data: { workflow_runs: runsInProgress },
  } = await github.actions.listWorkflowRuns({
    owner: OWNER,
    repo: REPO,
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
        owner: OWNER,
        repo: REPO,
        run_id: run.id,
      })
    )
  );
}

function handleError(err) {
  console.error(err);
  core.setFailed(`Unhandled error: ${err}`);
}
