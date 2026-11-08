import { inngest } from './client';
import {
  openai,
  createAgent,
  createTool,
  createNetwork,
  createState,
  type Tool,
  type Message,
} from '@inngest/agent-kit';
import Sandbox from '@e2b/code-interpreter';
import {
  getSandbox,
  lastAssistantTextMessageContent,
  parseOutput,
} from '@/inngest/utils';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { ProjectStatus } from '@/generated/prisma';
import { PROMPT, FRAGMENT_TITLE_PROMPT, RESPONSE_PROMPT } from '@/prompt';
import { SANDBOX_TIMEOUT } from '@/inngest/types';

const COMMAND_TIMEOUT = 90_000;
const MAX_COMMAND_OUTPUT = 20_000;

interface AgentState {
  summary: string;
  files: { [path: string]: string };
}

export const codeAgentFunction = inngest.createFunction(
  { id: 'code-agent' },
  { event: 'code-agent/run' },
  async ({ event, step }) => {
    try {
      await step.run('mark-project-running', async () => {
        await prisma.project.update({
          where: { id: event.data.projectId },
          data: {
            status: ProjectStatus.RUNNING,
            generationStep: 'Preparing sandbox',
            generationProgress: 5,
            generationError: null,
            generationStartedAt: new Date(),
            generationCompletedAt: null,
            generationAttempt: { increment: 1 },
          },
        });
      });

      const sandboxId = await step.run('get-sandbox-id', async () => {
        const sandbox = await Sandbox.create('pulpable-nextjs-dev');
        await sandbox.setTimeout(SANDBOX_TIMEOUT);
        return sandbox.sandboxId;
      });

      await step.run('mark-sandbox-ready', async () => {
        await prisma.project.update({
          where: { id: event.data.projectId },
          data: {
            generationStep: 'Reading project context',
            generationProgress: 15,
          },
        });
      });

      const previousMessages = await step.run(
        'get-previous-messages',
        async () => {
          const formattedMessages: Message[] = [];
          const messages = await prisma.message.findMany({
            where: {
              projectId: event.data.projectId,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 5,
          });

          for (const message of messages) {
            formattedMessages.push({
              type: 'text',
              role: message.role === 'ASSISTANT' ? 'assistant' : 'user',
              content: message.content,
            });
          }
          return formattedMessages.reverse();
        }
      );

      const state = createState<AgentState>(
        {
          summary: '',
          files: {},
        },
        {
          messages: previousMessages,
        }
      );

      const codeAgent = createAgent<AgentState>({
        name: 'code-agent',
        description: 'An expert coding agent',
        system: PROMPT,
        model: openai({
          model: 'gpt-6.1-sol',
        }),
        tools: [
          createTool({
            name: 'terminal',
            description: 'Use the terminal to run commands',
            parameters: z.object({
              command: z.string(),
            }),
            handler: async ({ command }, { step }) => {
              const buffers = { stdout: '', stderr: '' };
              const appendOutput = (key: 'stdout' | 'stderr', data: string) => {
                buffers[key] = `${buffers[key]}${data}`.slice(
                  -MAX_COMMAND_OUTPUT
                );
              };
              try {
                const result = await step?.run(
                  'Running Terminal Command',
                  async () => {
                    const sandbox = await getSandbox(sandboxId);
                    return await sandbox.commands.run(command, {
                      timeoutMs: COMMAND_TIMEOUT,
                      onStdout: (data: string) => appendOutput('stdout', data),
                      onStderr: (data: string) => appendOutput('stderr', data),
                    });
                  }
                );

                if (result) return result.stdout;

                return 'Nothing here';
              } catch (err) {
                console.log(
                  `Command failed: ${err} \nstdout: ${buffers.stdout} \nstderr: ${buffers.stderr}`
                );
                return `Command failed: ${err} \nstdout: ${buffers.stdout} \nstderr: ${buffers.stderr}`;
              }
            },
          }),
          createTool({
            name: 'createOrUpdateFiles',
            description: 'Create or update files in the sandbox',
            parameters: z.object({
              files: z.array(
                z.object({
                  path: z.string(),
                  content: z.string(),
                })
              ),
            }),
            handler: async (
              { files },
              { network, step }: Tool.Options<AgentState>
            ) => {
              try {
                const updatedFiles = await step?.run(
                  'Writing Files',
                  async () => {
                    const updatedFiles = network.state.data.files || {};

                    const sandbox = await getSandbox(sandboxId);
                    for (const file of files) {
                      await sandbox.files.write(file.path, file.content);
                      updatedFiles[file.path] = file.content;
                    }

                    return updatedFiles;
                  }
                );

                if (updatedFiles) {
                  network.state.data.files = updatedFiles;
                }

                return 'Files created/updated successfully';
              } catch (e) {
                return 'Error: ' + e;
              }
            },
          }),
          createTool({
            name: 'readFiles',
            description: 'Read files from sandbox',
            parameters: z.object({
              files: z.array(z.string()),
            }),
            handler: async ({ files }, { step }) => {
              try {
                await step?.run('Reading Files', async () => {
                  const sandbox = await getSandbox(sandboxId);
                  console.log('Running readFiles');
                  const contents = [];
                  for (const file of files) {
                    const content = await sandbox.files.read(file);
                    contents.push({ path: file, content });
                  }
                  return JSON.stringify(contents);
                });
              } catch (err) {
                return 'Error: ' + err;
              }
            },
          }),
        ],

        lifecycle: {
          onResponse: async ({ result, network }) => {
            const lastAssistantMessageText =
              lastAssistantTextMessageContent(result);

            if (lastAssistantMessageText && network) {
              if (lastAssistantMessageText.includes('<task_summary>')) {
                network.state.data.summary = lastAssistantMessageText;
              }
            }
            return result;
          },
        },
      });

      await step.run('mark-agent-running', async () => {
        await prisma.project.update({
          where: { id: event.data.projectId },
          data: {
            generationStep: 'Building your app',
            generationProgress: 25,
          },
        });
      });

      const network = createNetwork<AgentState>({
        name: 'codingAgentNetwork',
        agents: [codeAgent],
        maxIter: 15,
        defaultState: state,
        router: async ({ network }) => {
          const summary = network.state.data.summary;
          if (summary) return;
          return codeAgent;
        },
      });

      const result = await network.run(event.data.value, {
        state,
      });

      await step.run('mark-agent-finished', async () => {
        await prisma.project.update({
          where: { id: event.data.projectId },
          data: {
            generationStep: 'Finalizing preview',
            generationProgress: 85,
          },
        });
      });

      const fragmentTitleGenerator = createAgent({
        name: 'fragment-title-generator',
        description: 'A fragment title generator',
        system: FRAGMENT_TITLE_PROMPT,
        model: openai({
          model: 'gpt-6-luna',
        }),
      });

      const responseGenerator = createAgent({
        name: 'response-generator',
        description: 'A response generator',
        system: RESPONSE_PROMPT,
        model: openai({
          model: 'gpt-6-luna',
        }),
      });

      const { output: fragmentTitleOutput } = await fragmentTitleGenerator.run(
        result.state.data.summary
      );
      const { output: responseOutput } = await responseGenerator.run(
        result.state.data.summary
      );

      const isError =
        !result.state.data.summary ||
        Object.keys(result.state.data.files || {}).length === 0;

      const sandboxUrl = await step.run('get-sandbox-url', async () => {
        const sandbox = await getSandbox(sandboxId);
        const host = sandbox.getHost(3000);
        return `https://${host}`;
      });

      await step.run('save-result', async () => {
        if (isError) {
          const errorMessage = await prisma.message.create({
            data: {
              projectId: event.data.projectId,
              content: 'Something went wrong. Please try again.',
              role: 'ASSISTANT',
              type: 'ERROR',
            },
          });
          await prisma.project.update({
            where: { id: event.data.projectId },
            data: {
              status: ProjectStatus.FAILED,
              generationStep: 'Generation failed',
              generationError: 'The agent did not produce a usable app.',
              generationProgress: 0,
              generationCompletedAt: new Date(),
            },
          });
          return errorMessage;
        }
        const resultMessage = await prisma.message.create({
          data: {
            projectId: event.data.projectId,
            content: parseOutput(responseOutput),
            role: 'ASSISTANT',
            type: 'RESULT',
            fragment: {
              create: {
                sandboxUrl: sandboxUrl,
                title: parseOutput(fragmentTitleOutput),
                files: result.state.data.files,
              },
            },
          },
        });
        await prisma.project.update({
          where: { id: event.data.projectId },
          data: {
            status: ProjectStatus.SUCCEEDED,
            generationStep: 'Ready',
            generationProgress: 100,
            generationError: null,
            generationCompletedAt: new Date(),
          },
        });
        return resultMessage;
      });

      return {
        url: sandboxUrl,
        title: 'Fragment',
        files: result.state.data.files,
        summary: result.state.data.summary,
      };
    } catch (error) {
      await step.run('mark-project-failed', async () => {
        await prisma.project.update({
          where: { id: event.data.projectId },
          data: {
            status: ProjectStatus.FAILED,
            generationStep: 'Generation failed',
            generationError:
              error instanceof Error
                ? error.message.slice(0, 1000)
                : 'The generation failed unexpectedly.',
            generationProgress: 0,
            generationCompletedAt: new Date(),
          },
        });
      });
      throw error;
    }
  }
);
