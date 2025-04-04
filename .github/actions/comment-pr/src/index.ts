import * as core from '@actions/core';
import * as github from '@actions/github';

async function run() {
  try {
    const token = core.getInput('github_token');
    const title = core.getInput('title');
    const block = core.getInput('block');
    const message = core.getInput('message');
    const octokit = github.getOctokit(token);

    const context = github.context;
    const { data: comments } = await octokit.rest.issues.listComments({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.issue.number
    });

    const blockTitle = `#### ${title}`;
    const blockMessage = block ? `\`\`\`\n${block}\n\`\`\`` : '';
    const output = `${blockTitle}\n\n${blockMessage}\n${message}`;

    const existingComment = comments.find(
      comment => comment.user?.type === 'Bot' && comment.body?.startsWith(blockTitle)
    );

    if (existingComment) {
      core.info(`Updating existing comment ${title}`);
      await octokit.rest.issues.updateComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        comment_id: existingComment.id,
        body: output
      });
    } else {
      core.info(`Creating new comment ${title}`);
      await octokit.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: output
      });
    }
  } catch (error) {
    core.setFailed(error as string | Error);
  }
}

run();

export default run;
