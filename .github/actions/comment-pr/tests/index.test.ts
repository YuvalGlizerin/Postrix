import * as core from '@actions/core';
import * as github from '@actions/github';

import run from '../src/index.ts';

// Mock the GitHub Actions core and github packages
jest.mock('@actions/core');
jest.mock('@actions/github');

describe('comment-pr action', () => {
  let mockOctokit: {
    rest: {
      issues: {
        listComments: jest.Mock;
        deleteComment: jest.Mock;
        createComment: jest.Mock;
      };
    };
  };

  beforeEach(() => {
    jest.resetAllMocks();

    // Mock input values
    (core.getInput as jest.Mock).mockImplementation((name: string) => {
      switch (name) {
        case 'github_token':
          return 'mock-token';
        case 'title':
          return 'Test Title';
        case 'block':
          return 'console.log("test")';
        case 'message':
          return 'This is a test message';
        default:
          return '';
      }
    });

    // Mock GitHub context
    const mockContext = {
      repo: {
        owner: 'test-owner',
        repo: 'test-repo'
      },
      issue: {
        number: 123
      }
    };

    // Use type assertion to mock the github context
    Object.assign(github.context, mockContext);

    // Mock Octokit
    mockOctokit = {
      rest: {
        issues: {
          listComments: jest.fn(),
          deleteComment: jest.fn(),
          createComment: jest.fn()
        }
      }
    };

    (github.getOctokit as jest.Mock).mockReturnValue(mockOctokit);
  });

  test('should create a comment with the correct format', async () => {
    // Mock the response from listComments
    mockOctokit.rest.issues.listComments.mockResolvedValue({
      data: []
    });

    await run();

    // Verify createComment was called with the right parameters
    expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      issue_number: 123,
      body: '#### Test Title\n\n```\nconsole.log("test")\n```\nThis is a test message'
    });
  });

  test('should delete existing bot comments with the same title before creating a new one', async () => {
    // Mock existing comments
    mockOctokit.rest.issues.listComments.mockResolvedValue({
      data: [
        {
          id: 456,
          user: { type: 'Bot' },
          body: '#### Test Title\n\nPrevious comment'
        },
        {
          id: 789,
          user: { type: 'User' },
          body: 'Some other comment'
        }
      ]
    });

    await run();

    // Verify deleteComment was called for the bot comment with matching title
    expect(mockOctokit.rest.issues.deleteComment).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      comment_id: 456
    });

    // Verify createComment was called after deleting
    expect(mockOctokit.rest.issues.createComment).toHaveBeenCalled();
  });

  test('should handle errors appropriately', async () => {
    // Mock an error
    const error = new Error('API error');
    mockOctokit.rest.issues.listComments.mockRejectedValue(error);

    await run();

    // Verify error is handled
    expect(core.setFailed).toHaveBeenCalledWith(error);
  });
});
