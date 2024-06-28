import * as core from '@actions/core';
import * as github from '@actions/github';
import { Context } from '@actions/github/lib/context';

async function run() {
    try {
        const token = core.getInput('github_token');
        const title = core.getInput('title');
        const message = core.getInput('message');
        const octokit = github.getOctokit(token);

        const context: Context = github.context;
        const { data: comments } = await octokit.rest.issues.listComments({
            owner: context.repo.owner,
            repo: context.repo.repo,
            issue_number: context.issue.number,
        });
        const botComment = comments.find(comment => {
            return comment?.user?.type === 'Bot' && comment?.body?.includes(title)
        });

        const output = `#### ${title}\n\n\`\`\`\n${message}`;
            
        if (botComment) {
            octokit.rest.issues.deleteComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              comment_id: botComment.id,
            });
        }
        octokit.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: output
        });
    } catch (error) {
        core.setFailed(<Error>error);
    }
}

run();