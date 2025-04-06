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
        updateComment: jest.Mock;
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
          updateComment: jest.fn(),
          createComment: jest.fn()
        }
      }
    };

    (github.getOctokit as jest.Mock).mockReturnValue(mockOctokit);
  });

  test('should create a comment when no matching comment exists', async () => {
    // Mock the response from listComments - no existing comments
    mockOctokit.rest.issues.listComments.mockResolvedValue({
      data: []
    });

    await run();

    // Verify createComment was called with the right parameters
    expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
      owner: 'test-owner2',
      repo: 'test-repo',
      issue_number: 123,
      body: '#### Test Title\n\n```\nconsole.log("test")\n```\nThis is a test message'
    });

    // Verify updateComment was not called
    expect(mockOctokit.rest.issues.updateComment).not.toHaveBeenCalled();
  });

  test('should update an existing bot comment with the same title', async () => {
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

    // Verify updateComment was called for the matching comment
    expect(mockOctokit.rest.issues.updateComment).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      comment_id: 456,
      body: '#### Test Title\n\n```\nconsole.log("test")\n```\nThis is a test message'
    });

    // Verify createComment was not called
    expect(mockOctokit.rest.issues.createComment).not.toHaveBeenCalled();
  });

  test('should create a new comment if no bot comment with matching title exists', async () => {
    // Mock existing comments with no matching title
    mockOctokit.rest.issues.listComments.mockResolvedValue({
      data: [
        {
          id: 456,
          user: { type: 'Bot' },
          body: '#### Different Title\n\nSome content'
        },
        {
          id: 789,
          user: { type: 'User' },
          body: 'Some other comment'
        }
      ]
    });

    await run();

    // Verify createComment was called
    expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      issue_number: 123,
      body: '#### Test Title\n\n```\nconsole.log("test")\n```\nThis is a test message'
    });

    // Verify updateComment was not called
    expect(mockOctokit.rest.issues.updateComment).not.toHaveBeenCalled();
  });

  test('should handle errors appropriately', async () => {
    // Mock an error
    const error = new Error('API error');
    mockOctokit.rest.issues.listComments.mockRejectedValue(error);

    await run();

    // Verify error is handled
    expect(core.setFailed).toHaveBeenCalledWith(error);
  });

  test('should handle comments without a block parameter', async () => {
    // Override the mock for block input to return an empty string
    (core.getInput as jest.Mock).mockImplementation((name: string) => {
      switch (name) {
        case 'github_token':
          return 'mock-token';
        case 'title':
          return 'Test Title';
        case 'block':
          return ''; // Empty block
        case 'message':
          return 'This is a test message';
        default:
          return '';
      }
    });

    // Mock the response from listComments - no existing comments
    mockOctokit.rest.issues.listComments.mockResolvedValue({
      data: []
    });

    await run();

    // Verify createComment was called with the right parameters (no code block)
    expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      issue_number: 123,
      body: '#### Test Title\n\n\nThis is a test message' // Note: no code block here
    });
  });

  test('should format comment differently when block is null or undefined', async () => {
    // Override the mock for block input to return undefined
    (core.getInput as jest.Mock).mockImplementation((name: string) => {
      switch (name) {
        case 'github_token':
          return 'mock-token';
        case 'title':
          return 'Test Title';
        case 'block':
          return undefined; // Undefined block
        case 'message':
          return 'This is a test message';
        default:
          return '';
      }
    });

    // Mock the response from listComments
    mockOctokit.rest.issues.listComments.mockResolvedValue({
      data: []
    });

    await run();

    // Verify createComment was called with the right parameters (no code block)
    expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
      owner: 'test-owner',
      repo: 'test-repo',
      issue_number: 123,
      body: '#### Test Title\n\n\nThis is a test message'
    });
  });
});
