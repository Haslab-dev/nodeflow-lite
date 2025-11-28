// engine.ts
// ===================================================
// 1. TYPES
// ===================================================

type Ctx = Record<string, any>;
type StepFn = (ctx: Ctx) => Promise<Ctx> | Ctx;

type Step =
  | { id: string; type: "task"; run: StepFn }
  | { id: string; type: "parallel"; steps: Step[] }
  | {
      id: string;
      type: "condition";
      when: (ctx: Ctx) => boolean;
      then: Step[];
      else?: Step[];
    };

type Workflow = {
  id: string;
  steps: Step[];
};

// ===================================================
// 2. WORKFLOW ENGINE
// ===================================================

async function runStep(step: Step, ctx: Ctx): Promise<Ctx> {
  console.log(`   → Step: ${step.id} (${step.type})`);

  switch (step.type) {
    case "task":
      return (await step.run(ctx)) || ctx;

    case "parallel": {
      const results = await Promise.all(step.steps.map(s => runStep(s, ctx)));
      // merge contexts
      return Object.assign(ctx, ...results);
    }

    case "condition": {
      const branch = step.when(ctx) ? step.then : step.else ?? [];
      for (const s of branch) ctx = await runStep(s, ctx);
      return ctx;
    }

    default:
      return ctx;
  }
}

async function runWorkflow(wf: Workflow, initial: Ctx = {}) {
  console.log(`\n=== Running Workflow: ${wf.id} ===`);
  let ctx = { ...initial };

  for (const step of wf.steps) {
    try {
      ctx = await runStep(step, ctx);
    } catch (err) {
      console.error(`❌ Error in step ${step.id}:`, err);
      ctx.error = err;
      break;
    }
  }

  console.log(`=== Completed Workflow: ${wf.id} ===\n`);
  return ctx;
}

// ===================================================
// 3. STEP DEFINITIONS
// ===================================================

const steps = {
  fetchUser: {
    id: "fetchUser",
    type: "task" as const,
    run: async (ctx: Ctx) => {
      await new Promise(r => setTimeout(r, 200));
      return {
        ...ctx,
        user: {
          id: 1,
          name: "Kamera",
          role: "admin",
        },
      };
    },
  },

  aiAnalyze: {
    id: "aiAnalyze",
    type: "task" as const,
    run: async (ctx: Ctx) => {
      return {
        ...ctx,
        ai: {
          summary: `User ${ctx.user.name} has role ${ctx.user.role}`,
        },
      };
    },
  },

  saveRecord: {
    id: "saveRecord",
    type: "task" as const,
    run: async (ctx: Ctx) => {
      console.log("   ✔ Saving:", ctx.ai.summary);
      return ctx;
    },
  },

  fetchOrders: {
    id: "fetchOrders",
    type: "task" as const,
    run: () => ({
      orders: [
        { id: 10, item: "Burger", price: 30000 },
        { id: 11, item: "Tea", price: 7000 },
      ],
    }),
  },

  calcTotal: {
    id: "calcTotal",
    type: "task" as const,
    run: (ctx: Ctx) => ({
      ...ctx,
      total: ctx.orders.reduce((sum: number, o: any) => sum + o.price, 0),
    }),
  },

  printReceipt: {
    id: "printReceipt",
    type: "task" as const,
    run: (ctx: Ctx) => {
      console.log("   🧾 Receipt:");
      console.log("   Items:", ctx.orders.length);
      console.log("   Total:", ctx.total);
      return ctx;
    },
  },
};

// ===================================================
// 4. MULTIPLE WORKFLOWS
// ===================================================

const workflows: Workflow[] = [
  // -----------------------------------------
  // WORKFLOW #1: AI USER ENRICHMENT
  // -----------------------------------------
  {
    id: "user_ai_enrich",
    steps: [
      steps.fetchUser,
      {
        id: "userCheck",
        type: "condition",
        when: (ctx) => ctx.user.role === "admin",
        then: [steps.aiAnalyze],
        else: [
          {
            id: "skipAI",
            type: "task",
            run: (ctx) => ({ ...ctx, ai: { summary: "No AI for non-admin" } }),
          },
        ],
      },
      steps.saveRecord,
    ],
  },

  // -----------------------------------------
  // WORKFLOW #2: ORDER BILLING + PARALLEL
  // -----------------------------------------
  {
    id: "order_billing",
    steps: [
      {
        id: "parallelFetch",
        type: "parallel",
        steps: [steps.fetchOrders, steps.fetchUser],
      },
      steps.calcTotal,
      steps.printReceipt,
    ],
  },

  // -----------------------------------------
  // WORKFLOW #3: SIMPLE
  // -----------------------------------------
  {
    id: "simple",
    steps: [
      {
        id: "ping",
        type: "task",
        run: () => ({ msg: "pong!" }),
      },
    ],
  },
];

// ===================================================
// 5. RUNTIME EXECUTION
// ===================================================

async function main() {
  for (const wf of workflows) {
    await runWorkflow(wf);
  }
}

main();
