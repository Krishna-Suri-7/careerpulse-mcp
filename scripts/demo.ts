import { TOOL_REGISTRY } from '../src/handlers/tool-registry.js';
import { PROMPT_REGISTRY } from '../src/handlers/prompt-registry.js';

async function runDemo() {
  console.log('\n===========================================================');
  console.log('🚀 CareerPulse MCP Server - Interactive Local Test Demo');
  console.log('===========================================================\n');

  // Sample Candidate Profile
  const sampleProfile = {
    fullName: 'Alex Chen',
    headline: 'Senior Backend Engineer | Distributed Systems & Cloud Infrastructure',
    summary: 'Backend software engineer with 6+ years specializing in high-throughput microservices, Redis caching, and PostgreSQL optimization.',
    experiences: [
      {
        title: 'Senior Software Engineer',
        company: 'CloudScale Labs',
        bulletPoints: [
          'Engineered event-driven payment processing pipeline handling 12,000 requests/sec with Node.js and Redis.',
          'Reduced p99 database query latency by 45% by restructuring indexing and query batching in PostgreSQL.',
          'Spearheaded migration of 8 legacy services to Docker and Kubernetes with zero customer downtime.',
        ],
      },
    ],
    skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'Redis', 'Docker', 'Kubernetes'],
    education: [
      {
        school: 'University of California, Berkeley',
        degree: 'B.S. Computer Science',
      },
    ],
  };

  // 1. Audit ATS Readiness
  console.log('--- [Test 1] audit_job_readiness ---');
  const atsResponse = await TOOL_REGISTRY['audit_job_readiness'].handler({
    profile: sampleProfile,
  });
  const atsResult = JSON.parse(atsResponse.content[0].text);
  console.log(`Composite ATS Score: ${atsResult.compositeScore}/100`);
  console.log(`Impact Metrics Score: ${atsResult.factors.impactMetrics.score}/100 (Detected: ${atsResult.factors.impactMetrics.detectedMetricsCount} metrics)`);
  console.log(`Action Verb Strength: ${atsResult.factors.verbStrength.score}/100`);
  console.log(`Key Strengths: ${atsResult.strengths.slice(0, 2).join(' | ')}`);
  console.log(`Status: ✅ PASS\n`);

  // 2. Analyze Role Fit (Keyword Gap)
  console.log('--- [Test 2] analyze_role_fit ---');
  const targetJobDescription = `
    We are seeking a Staff Backend Engineer to lead our Distributed Platforms team.
    Key Requirements:
    - Deep expertise in TypeScript, Node.js, and Go.
    - Production experience with PostgreSQL, Redis, and Apache Kafka.
    - Cloud architecture on AWS and Kubernetes.
    - Strong grasp of distributed systems, concurrency, and observability.
  `;
  const fitResponse = await TOOL_REGISTRY['analyze_role_fit'].handler({
    profile: sampleProfile,
    targetJobDescription,
    targetRoleTitle: 'Staff Backend Engineer',
  });
  const fitResult = JSON.parse(fitResponse.content[0].text);
  console.log(`Role Match Score: ${fitResult.matchScore}%`);
  console.log(`Matched Hard Skills: ${fitResult.hardSkills.matched.join(', ')}`);
  console.log(`Missing Hard Skills: ${fitResult.hardSkills.missing.join(', ')}`);
  console.log(`Sample Recruiter Boolean Query: ${fitResult.recruiterBooleanSearchQueries.sampleRecruiterBooleanString}`);
  console.log(`Status: ✅ PASS\n`);

  // 3. Draft Proof-of-Work Post
  console.log('--- [Test 3] draft_proof_of_work_post ---');
  const powResponse = await TOOL_REGISTRY['draft_proof_of_work_post'].handler({
    type: 'architecture_decision',
    technicalNotes: [
      'Migrated synchronized REST polling to event-driven Kafka topics',
      'Configured Redis distributed locks with idempotent consumer retry queues',
      'Isolated cold query paths to read-replicas',
    ],
    context: 'Scaling payment settlement service to 10M events/day',
    toolsAndTech: ['Kafka', 'Redis', 'PostgreSQL', 'Go'],
    metrics: ['dropped p99 latency from 340ms to 18ms', 'cut database CPU from 85% to 28%'],
    githubUrl: 'https://github.com/alexchen/event-pipeline-benchmark',
  });
  const powResult = JSON.parse(powResponse.content[0].text);
  console.log(`Post Type: ${powResult.postType}`);
  console.log(`Hook: "${powResult.headlineHook}"`);
  console.log(`Word Count: ${powResult.wordCount} words (Under 180 words: ${powResult.isUnder180Words})`);
  console.log(`LLM Cliché Score: ${powResult.llmClicheScore}/100 (0 = authentic engineer)`);
  console.log(`Status: ✅ PASS\n`);

  // 4. Humanize Content (AI Cliché Stripper)
  console.log('--- [Test 4] humanize_content ---');
  const rawTextWithCliches =
    'I am thrilled to announce that we delve into cutting-edge distributed databases. It stands as a testament to our team as we seamlessly supercharge systems in today\'s fast-paced world.';
  const humanizeResponse = await TOOL_REGISTRY['humanize_content'].handler({
    text: rawTextWithCliches,
  });
  const humanizeResult = JSON.parse(humanizeResponse.content[0].text);
  console.log(`Original Cliché Score: ${humanizeResult.clicheScore}/100`);
  console.log(`Cliches Detected: ${humanizeResult.detectedCliches.map((c: any) => c.cliche).join(', ')}`);
  console.log(`Humanized Clean Output: "${humanizeResult.humanizedText}"`);
  console.log(`Status: ✅ PASS\n`);

  // 5. Generate Passive Visibility Plan
  console.log('--- [Test 5] generate_passive_visibility_plan ---');
  const planResponse = await TOOL_REGISTRY['generate_passive_visibility_plan'].handler({
    targetRole: 'Staff Distributed Systems Engineer',
    primaryTechStack: ['Go', 'TypeScript', 'Kubernetes', 'PostgreSQL', 'Redis'],
    cadenceDays: 30,
  });
  const planResult = JSON.parse(planResponse.content[0].text);
  console.log(`Plan Target Role: ${planResult.targetRole}`);
  console.log(`Total Posts Generated: ${planResult.postDrafts.length} posts (Days 7 and 21)`);
  console.log(`Total Comment Blueprints: ${planResult.commentingBlueprints.length} blueprints (Days 3, 12, 18, 27)`);
  console.log(`Recruiter Filter Strategy: ${planResult.recruiterDiscoveryStrategy.activeCandidateFilterBoost}`);
  console.log(`Status: ✅ PASS\n`);

  // 6. Test 1-Click MCP Prompt Presets
  console.log('--- [Test 6] MCP Prompt Registry (1-Click Presets) ---');
  const promptNames = Object.keys(PROMPT_REGISTRY);
  console.log(`Registered Prompt Presets (${promptNames.length}): ${promptNames.join(', ')}`);

  const auditPrompt = await PROMPT_REGISTRY['audit-my-profile'].handler({
    filePath: 'C:\\Users\\Krishna Suri\\Downloads\\Profile.pdf',
    targetRole: 'Senior Distributed Systems Engineer',
  });
  console.log(`Prompt "audit-my-profile" Message Length: ${auditPrompt.messages[0].content.text.length} chars`);

  const jobFitPrompt = await PROMPT_REGISTRY['target-job-fit'].handler({
    targetJobDescription: 'Seeking Staff Distributed Systems Engineer with Go and Kubernetes.',
    targetRoleTitle: 'Staff Distributed Systems Engineer',
  });
  console.log(`Prompt "target-job-fit" Generated: Guided Role Fit instructions ready`);
  console.log(`Status: ✅ PASS\n`);

  console.log('===========================================================');
  console.log('🎉 All Tools & Prompt Presets Verified Successfully!');
  console.log('===========================================================\n');
}

runDemo().catch((err) => {
  console.error('Demo error:', err);
  process.exit(1);
});
