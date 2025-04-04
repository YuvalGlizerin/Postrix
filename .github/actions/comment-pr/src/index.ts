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

    const blockMessage = block ? `\`\`\`\n${block}\n\`\`\`` : '';
    const output = `#### ${title}\n\n${blockMessage}\n${message}`;

    // Find existing bot comment with the same title
    const existingComment = comments.find(comment => comment?.user?.type === 'Bot' && comment?.body?.includes(title));

    if (existingComment) {
      // Update existing comment
      await octokit.rest.issues.updateComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        comment_id: existingComment.id,
        body: output
      });
      core.info(`Updated existing comment with ID ${existingComment.id}`);
    } else {
      // Create new comment if none exists
      await octokit.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: output
      });
      core.info('Created new comment');
    }
  } catch (error) {
    core.setFailed(error as string | Error);
  }
}

run();

export default run;
