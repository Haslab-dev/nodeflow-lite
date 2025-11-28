import type { CodeWorkflow, ProgrammaticWorkflow } from "../types/index";
import { StepFunctions, stepsToArray } from "../CodeWorkflowEngine";

// Example programmatic workflows
export const programmaticWorkflowExamples: CodeWorkflow[] = [
  {
    id: 'http-api-processor',
    name: 'HTTP API Processor',
    description: 'Process incoming HTTP requests and store data',
    triggers: ['http-in'],
    autoStart: true,
    steps: stepsToArray({
      logRequest: {
        id: "logRequest",
        type: "task" as const,
        run: async (ctx) => {
          console.log('Processing HTTP request:', ctx.httpRequest);
          return { ...ctx, processedAt: Date.now() };
        },
      },

      validateData: {
        id: "validateData",
        type: "task" as const,
        run: async (ctx) => {
          const data = ctx.httpRequest?.body || {};
          const isValid = data && typeof data === 'object' && data.name;
          return { ...ctx, isValid, validatedData: isValid ? data : null };
        },
      },

      checkValid: StepFunctions.condition(
        (ctx) => ctx.isValid,
        [
          {
            id: "saveData",
            type: "task" as const,
            run: async (ctx) => {
              console.log('Saving valid data:', ctx.validatedData);
              // In real implementation, save to database
              return { ...ctx, saved: true, savedAt: Date.now() };
            },
          },
          {
            id: "sendResponse",
            type: "task" as const,
            run: async (ctx) => {
              console.log('Data saved successfully');
              return { ...ctx, response: { status: 'success', message: 'Data processed' } };
            },
          }
        ],
        [
          {
            id: "sendError",
            type: "task" as const,
            run: async (ctx) => {
              console.log('Invalid data received');
              return { ...ctx, response: { status: 'error', message: 'Invalid data' } };
            },
          }
        ]
      )
    })
  },

  {
    id: 'mqtt-sensor-processor',
    name: 'MQTT Sensor Data Processor',
    description: 'Process sensor data from MQTT and apply business logic',
    triggers: ['mqtt'],
    autoStart: true,
    steps: stepsToArray({
      parseSensorData: {
        id: "parseSensorData",
        type: "task" as const,
        run: async (ctx) => {
          const data = ctx.mqtt?.payload || {};
          const sensorId = data.sensorId || 'unknown';
          const value = parseFloat(data.value) || 0;
          const timestamp = Date.now();
          
          return {
            ...ctx,
            sensorData: { sensorId, value, timestamp, raw: data }
          };
        },
      },

      checkThresholds: {
        id: "checkThresholds",
        type: "task" as const,
        run: async (ctx) => {
          const { value } = ctx.sensorData;
          const thresholds = { min: 0, max: 100, warning: 80 };
          
          return {
            ...ctx,
            thresholds,
            status: value > thresholds.warning ? 'warning' :
                    value < thresholds.min || value > thresholds.max ? 'error' : 'normal'
          };
        },
      },

      checkStatus: StepFunctions.condition(
        (ctx) => ctx.status !== 'normal',
        [
          StepFunctions.parallel([
            {
              id: "logAlert",
              type: "task" as const,
              run: async (ctx) => {
                console.log(`ALERT: Sensor ${ctx.sensorData.sensorId} status: ${ctx.status}, value: ${ctx.sensorData.value}`);
                return ctx;
              },
            },
            {
              id: "sendNotification",
              type: "task" as const,
              run: async (ctx) => {
                console.log(`Sending notification for sensor ${ctx.sensorData.sensorId}`);
                // In real implementation, send email/SMS/push notification
                return { ...ctx, notificationSent: true };
              },
            }
          ])
        ],
        [
          {
            id: "logNormal",
            type: "task" as const,
            run: async (ctx) => {
              console.log(`Normal reading: Sensor ${ctx.sensorData.sensorId} = ${ctx.sensorData.value}`);
              return ctx;
            },
          }
        ]
      ),

      storeData: {
        id: "storeData",
        type: "task" as const,
        run: async (ctx) => {
          console.log('Storing sensor data:', ctx.sensorData);
          // In real implementation, store to database or time series
          return { ...ctx, stored: true };
        },
      }
    })
  },

  {
    id: 'webhook-automation',
    name: 'Webhook Automation',
    description: 'Automate tasks based on webhook events',
    triggers: ['webhook'],
    autoStart: true,
    steps: stepsToArray({
      parseEvent: {
        id: "parseEvent",
        type: "task" as const,
        run: async (ctx) => {
          const event = ctx.webhook?.event || 'unknown';
          const data = ctx.webhook?.data || {};
          
          return { ...ctx, event, eventData: data };
        },
      },

      checkEvent: StepFunctions.condition(
        (ctx) => ctx.event === 'user.created',
        [
          StepFunctions.parallel([
            {
              id: "sendWelcomeEmail",
              type: "task" as const,
              run: async (ctx) => {
                console.log(`Sending welcome email to user: ${ctx.eventData.email}`);
                await StepFunctions.delay(1000)(ctx); // Simulate email sending
                return { ...ctx, welcomeEmailSent: true };
              },
            },
            {
              id: "createUserProfile",
              type: "task" as const,
              run: async (ctx) => {
                console.log(`Creating user profile for: ${ctx.eventData.userId}`);
                return { ...ctx, userProfileCreated: true };
              },
            }
          ])
        ],
        [
          StepFunctions.condition(
            (ctx) => ctx.event === 'payment.completed',
            [
              {
                id: "processPayment",
                type: "task" as const,
                run: async (ctx) => {
                  console.log(`Processing payment: ${ctx.eventData.paymentId}`);
                  return { ...ctx, paymentProcessed: true };
                },
              },
              {
                id: "updateSubscription",
                type: "task" as const,
                run: async (ctx) => {
                  console.log(`Updating subscription for user: ${ctx.eventData.userId}`);
                  return { ...ctx, subscriptionUpdated: true };
                },
              }
            ],
            [
              {
                id: "logUnknownEvent",
                type: "task" as const,
                run: async (ctx) => {
                  console.log(`Unknown event type: ${ctx.event}`);
                  return ctx;
                },
              }
            ]
          )
        ]
      ),

      logCompletion: {
        id: "logCompletion",
        type: "task" as const,
        run: async (ctx) => {
          console.log(`Webhook processing completed for event: ${ctx.event}`);
          return ctx;
        },
      }
    })
  },

  {
    id: 'data-pipeline',
    name: 'Data Processing Pipeline',
    description: 'Complex data processing with parallel execution',
    triggers: ['http-in'],
    autoStart: false, // Manual trigger only
    steps: stepsToArray({
      extractData: {
        id: "extractData",
        type: "task" as const,
        run: async (ctx) => {
          const source = ctx.httpRequest?.body?.source || 'api';
          console.log(`Extracting data from source: ${source}`);
          
          // Simulate data extraction
          await StepFunctions.delay(500)(ctx);
          const rawData = [
            { id: 1, name: 'Item 1', category: 'A', value: 100 },
            { id: 2, name: 'Item 2', category: 'B', value: 200 },
            { id: 3, name: 'Item 3', category: 'A', value: 150 },
            { id: 4, name: 'Item 4', category: 'C', value: 300 }
          ];
          
          return { ...ctx, rawData, source };
        },
      },

      parallelProcess: StepFunctions.parallel([
        {
          id: "filterCategoryA",
          type: "task" as const,
          run: async (ctx) => {
            const filtered = ctx.rawData.filter((item: any) => item.category === 'A');
            return { ...ctx, categoryA: filtered };
          },
        },
        {
          id: "calculateTotals",
          type: "task" as const,
          run: async (ctx) => {
            const total = ctx.rawData.reduce((sum: number, item: any) => sum + item.value, 0);
            const count = ctx.rawData.length;
            const average = total / count;
            return { ...ctx, statistics: { total, count, average } };
          },
        },
        {
          id: "groupByCategory",
          type: "task" as const,
          run: async (ctx) => {
            const grouped = ctx.rawData.reduce((acc: any, item: any) => {
              acc[item.category] = (acc[item.category] || 0) + item.value;
              return acc;
            }, {});
            return { ...ctx, categoryTotals: grouped };
          },
        }
      ]),

      enrichData: {
        id: "enrichData",
        type: "task" as const,
        run: async (ctx) => {
          const enriched = {
            ...ctx.statistics,
            categoryBreakdown: ctx.categoryTotals,
            specialCategory: ctx.categoryA,
            processedAt: Date.now(),
            source: ctx.source
          };
          
          console.log('Enriched data:', enriched);
          return { ...ctx, enrichedData: enriched };
        },
      },

      saveResults: {
        id: "saveResults",
        type: "task" as const,
        run: async (ctx) => {
          console.log('Saving processed results to database...');
          await StepFunctions.delay(200)(ctx); // Simulate database save
          return { ...ctx, saved: true, savedAt: Date.now() };
        },
      }
    })
  },

  {
    id: 'error-handling-demo',
    name: 'Error Handling Demo',
    description: 'Demonstrates error handling and recovery',
    triggers: ['http-in'],
    autoStart: false,
    steps: [
      StepFunctions.task('validateInput', async (ctx) => {
        const input = ctx.httpRequest?.body;
        if (!input || !input.action) {
          throw new Error('Missing required action parameter');
        }
        return { ...ctx, action: input.action, input };
      }),
      StepFunctions.task('processAction', async (ctx) => {
        console.log(`Processing action: ${ctx.action}`);
        
        // Simulate potential errors
        if (ctx.action === 'error') {
          throw new Error('Simulated processing error');
        }
        
        if (ctx.action === 'timeout') {
          await StepFunctions.delay(5000)(ctx); // Long operation
        }
        
        return { ...ctx, processed: true, result: `Action ${ctx.action} completed` };
      }),
      StepFunctions.task('finalize', async (ctx) => {
        console.log('Finalizing workflow execution');
        return { ...ctx, finalized: true, completedAt: Date.now() };
      })
    ]
  }
];

// Helper function to convert CodeWorkflow to ProgrammaticWorkflow
export function createProgrammaticWorkflow(codeWorkflow: CodeWorkflow): Omit<ProgrammaticWorkflow, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name: codeWorkflow.name,
    type: 'code',
    codeWorkflow
  };
}

// Pre-built programmatic workflows ready for database insertion
export const readyProgrammaticWorkflows = programmaticWorkflowExamples.map(createProgrammaticWorkflow);