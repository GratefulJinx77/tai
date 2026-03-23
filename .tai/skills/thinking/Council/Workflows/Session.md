# Council Session Workflow

## Do These 3 Things First (in order, no skipping)

**1. Voice notification:**

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running the Session workflow in the Council skill"}' \
  > /dev/null 2>&1 &
```

Running the **Session** workflow in the **Council** skill...

**2. Call TeamCreate:**

```
TeamCreate(team_name="council-{slug}", description="Council SESSION: {topic}")
```

Replace `{slug}` with a kebab-case version of the topic (e.g., `council-auth-design`). Replace `{topic}` with the user's topic.

This is a tool call. Call the TeamCreate tool now. If it fails or is unavailable, tell the user and fall back to `Workflows/Debate.md` instead.

**3. Call TaskCreate:**

```
TaskCreate(
  subject="Open Questions: {topic}",
  description="Unresolved disagreements and open questions from the council session."
)
```

This is a tool call. Call the TaskCreate tool now. Save the returned task ID.

---

**Phase 1 complete. Now output the session header:**

```markdown
## Council Session: [Topic]

**Council Members:** [List agents participating]
**Mode:** Persistent session (3 rounds + follow-up)
**Team:** council-{slug}
```

Default members: Architect (Serena Blackwood), Designer (Aditi Sharma), Engineer (Marcus Webb), Researcher (Ava Chen). Add Security (Rook Blackburn), Writer (Emma Hartley), or Fresh Eyes if the user requests them.

---

## Round 1: Initial Positions

Launch all council members **in parallel**. Every agent MUST include `team_name` and `name`:

```
Agent(
  subagent_type="Architect",
  team_name="council-{slug}",
  name="architect-serena",
  prompt="You are Serena Blackwood, Architect.

COUNCIL SESSION — ROUND 1: INITIAL POSITIONS
Topic: {topic}

Give your initial position from your architectural perspective.
- First person, 50-150 words
- Be specific and substantive
- State your key concern or recommendation
- You will respond to others in Round 2

Your focus: system design, patterns, scalability, long-term implications."
)
```

Repeat for all members, changing `subagent_type`, `name`, and perspective:

| Member | subagent_type | name | Focus |
|--------|--------------|------|-------|
| Architect | Architect | architect-serena | System design, patterns, scalability |
| Designer | Designer | designer-aditi | UX, user needs, accessibility |
| Engineer | Engineer | engineer-marcus | Implementation reality, tech debt, constraints |
| Researcher | PerplexityResearcher | researcher-ava | Data, precedent, external examples |
| Security | Pentester | security-rook | Risk, attack surface, compliance |
| Writer | general-purpose | writer-emma | Communication, documentation |

**Save each agent's returned `agent_id`.** You need these for Round 2.

Output the Round 1 transcript:

```markdown
### Round 1: Initial Positions

**🏛️ Architect (Serena):** [response]
**🎨 Designer (Aditi):** [response]
**⚙️ Engineer (Marcus):** [response]
**🔍 Researcher (Ava):** [response]
```

---

## Round 2: Responses & Challenges

**Resume** each agent using their `agent_id` from Round 1. Launch all in parallel:

```
Agent(
  resume="[agent_id from Round 1]",
  prompt="COUNCIL SESSION — ROUND 2: RESPONSES & CHALLENGES

Here is what the council said in Round 1:
[paste Round 1 transcript here]

Respond to the other council members:
- Reference specific points ('I disagree with Serena's point about X...')
- Challenge assumptions, add nuance
- Build on points you agree with
- 50-150 words"
)
```

Output Round 2 transcript in the same format.

---

## Round 3: Synthesis

**Resume** each agent again using their `agent_id` from Round 2. Launch all in parallel:

```
Agent(
  resume="[agent_id from Round 2]",
  prompt="COUNCIL SESSION — ROUND 3: SYNTHESIS

Full debate so far:
[paste Round 1 + Round 2 transcripts]

Final synthesis:
- Where does the council agree?
- Where do you still disagree?
- Your final recommendation given the full discussion?
- 50-150 words

Be honest about remaining disagreements."
)
```

Output Round 3 transcript.

---

## After Round 3: Synthesize and Save

**1. Write the council synthesis:**

```markdown
### Council Synthesis

**Areas of Convergence:**
- [Points where 3+ agents agreed]

**Remaining Disagreements:**
- [Points still contested]

**Recommended Path:**
[Synthesized recommendation based on weight of arguments]

**Open Questions:**
1. [Unresolved question from debate]
2. [Another unresolved question]
```

**2. Update the open questions task:**

```
TaskUpdate(
  taskId="[task ID from Phase 1]",
  description="Open questions:\n1. [question]\n2. [question]"
)
```

**3. Save session state to disk:**

```
mkdir -p ~/.claude/MEMORY/WORK/council-{slug}/
```

Write `session-state.json`:
```json
{
  "session_id": "council-{slug}",
  "topic": "{topic}",
  "status": "active",
  "members": [
    {"role": "architect", "name": "architect-serena", "persona": "Serena Blackwood", "agent_id": "{id}", "final_position": "{Round 3 summary}"},
    {"role": "designer", "name": "designer-aditi", "persona": "Aditi Sharma", "agent_id": "{id}", "final_position": "{Round 3 summary}"},
    {"role": "engineer", "name": "engineer-marcus", "persona": "Marcus Webb", "agent_id": "{id}", "final_position": "{Round 3 summary}"},
    {"role": "researcher", "name": "researcher-ava", "persona": "Ava Chen", "agent_id": "{id}", "final_position": "{Round 3 summary}"}
  ],
  "open_questions": ["..."],
  "rounds_completed": 3,
  "created": "{ISO timestamp}",
  "last_engaged": "{ISO timestamp}"
}
```

Write `transcript.md` with the full debate markdown.

**4. Output the session footer:**

```markdown
---

**Session Active** | Team: council-{slug} | Members: {N} | Open Questions: {N}

Follow-up commands:
- "Bring back the council" — reconvene all members
- "Bring back [Name]" — recall one member
- "Close the council session" — shutdown and archive
```

---

## Follow-Up (when user says "bring back")

Load state:
```
Read ~/.claude/MEMORY/WORK/council-{slug}/session-state.json
Read ~/.claude/MEMORY/WORK/council-{slug}/transcript.md
```

**Full reconvene** ("bring back the council"):

Resume all members with the follow-up context:
```
Agent(
  resume="[agent_id from state]",
  prompt="COUNCIL SESSION — FOLLOW-UP

You are {persona}, {role}.
Your final position was: {final_position}
Open questions: {open_questions}

The user has returned with: {user's follow-up}

Respond from your perspective, building on your prior position. 50-150 words."
)
```

**Selective recall** ("bring back Marcus"):

Resume only that member:
```
Agent(
  resume="[agent_id]",
  prompt="COUNCIL SESSION — SELECTIVE RECALL

You are Marcus Webb, Engineer.
Your final position was: {final_position}

The user wants to discuss: {user's question}

Respond directly. Reference the original debate where relevant."
)
```

If resume fails (agent expired), spawn a fresh agent with `team_name="council-{slug}"` and include the full transcript in the prompt for context.

Update `session-state.json` with new agent IDs after any follow-up.

---

## Close Session (when user says "close the council session")

```
SendMessage(type="shutdown_request", recipient="architect-serena", content="Session closing.")
```
Repeat for each member.

Update `session-state.json`: set `"status": "closed"`.

```
TeamDelete(team_name="council-{slug}")
```

Output:
```markdown
**Council Session Closed** | Topic: {topic} | Rounds: {N}
Transcript archived at: MEMORY/WORK/council-{slug}/transcript.md
```

---

## Timing

| Phase | Duration |
|-------|----------|
| Setup (TeamCreate + TaskCreate) | ~10-15 sec |
| Round 1 | ~10-20 sec |
| Round 2 | ~10-20 sec |
| Round 3 | ~10-20 sec |
| Synthesis + save | ~10 sec |
| **Total** | **~50-90 sec** |
| Follow-up (all members) | ~15-30 sec |
| Follow-up (one member) | ~5-15 sec |
