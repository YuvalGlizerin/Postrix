import * as core from '@actions/core';
import * as github from '@actions/github';
import { Context } from '@actions/github/lib/context';

async function run() {
  try {
    const token = core.getInput('github_token');
    const title = core.getInput('title');
    const block = core.getInput('block');
    const message = core.getInput('message');
    const octokit = github.getOctokit(token);

    const context: Context = github.context;
    const { data: comments } = await octokit.rest.issues.listComments({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.issue.number,
    });
    comments.forEach((comment) => {
      if (comment?.user?.type === 'Bot' && comment?.body?.includes(title)) {
        octokit.rest.issues.deleteComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          comment_id: comment.id,
        });
      }
    });

    const blockMessage = block ? `\`\`\`\n${block}\n\`\`\`` : '';
    const output = `#### ${title}\n\n${blockMessage}\n${message}`;
    octokit.rest.issues.createComment({
      issue_number: context.issue.number,
      owner: context.repo.owner,
      repo: context.repo.repo,
      body: output,
    });
  } catch (error) {
    core.setFailed(<Error>error);
  }
}

run();
