# Rijksmap extraction contract v4.22

Applies prospectively after the task owner's approval of the broad status rule. Finding means a source-supported substantive assertion, not necessarily evidence of effectiveness. This version is a development contract, not a production release or a pass for any earlier evaluation.

## Inclusion and evidence role

Review each selected assertion before applying an exclusion. Include report-presented empirical observations, actual implementation/legal-establishment status, evaluative judgments, report-adopted causal inferences or syntheses, and participant perceptions used as empirical evidence. A heading, background section or historical date is not an exclusion by itself. Mixed units may contain both qualifying and excluded assertions.

HAS_FINDING requires at least one qualifying assertion overlapping the selected target. NO_FINDING requires a source-specific exclusion of every target assertion. UNRESOLVED records insufficient evidence or a genuinely unsettled boundary; do not guess an exclusion. Keep inclusion separate from whether a complete literal extraction is possible.

Purpose-only statements, recommendations, proposals, bare eligibility/formula definitions, criteria, research methods/questions, navigation, unrelated orientation and unsupported stakeholder positions remain excluded. Supplied context may identify a referent or complete a qualification, but must not supply an unrelated finding outside the selected target.

## Approved precedence: introduced policy and tax arrangements

An actual introduction, legal establishment, commencement, operation or expenditure concerning the report's substantive policy/governance object can qualify as IMPLEMENTATION_STATUS. This expressly includes a tax exemption's actual introduction. The mere fact that the object is a legal rule does not exclude its realized establishment event. No evidence of uptake or effects is required to include that event.

The event allowance takes precedence over the legal-background exclusion when the target actually asserts that the arrangement was introduced or established. The legal-background exclusion still governs statements that merely describe what a rule means, who is eligible, what a formula requires, or what is planned. Mentioning an old date in such a definition does not turn it into an implementation event.

Preserve the precise milestone. Formal establishment does not establish commencement, use, delivery or effectiveness. If formal adoption is completed but commencement is future, retain that distinction and do not describe the rule as operating. Mere drafting or a proposed bill is preparation, not proof that its proposed arrangement was introduced. A mixed introduction-and-purpose statement includes the actual event, with the purpose kept as purpose.

Status milestones used in structured records: LEGAL_ESTABLISHMENT, INTRODUCED, COMMENCED, OPERATING, GOVERNANCE_ESTABLISHED, ACTUAL_EXPENDITURE. Do not manufacture dates, effective dates, beneficiaries, effects or a more advanced milestone. Select a different claim kind if the source separately makes an evaluative or causal claim; do not upgrade a status-only record downstream.

## Assertion kinds and interpretation limits

| Claim kind | Maximum interpretation of that record |
|---|---|
| IMPLEMENTATION_STATUS | The recorded milestone only; not effects, use or completion beyond that milestone |
| OBSERVED_EMPIRICAL_RESULT | The reported observation/calculation; no causal attribution inferred |
| REPORTED_PERCEPTION | The reported belief/experience as such; no adoption of its causal truth |
| EVALUATIVE_VERDICT | The report's assessment against its stated criterion; no additional causal claim |
| REPORT_CAUSAL_INFERENCE | The report's attributed causal inference, retaining its uncertainty and limitations |
| ADOPTED_SYNTHESIS | The source's adopted synthesis within its expressly supported scope |

Calculation outputs are not observed realized delivery. Expenditure is not value for money. Introduction is not effectiveness. A causal record is not automatically independently verified causation. These limits apply to both extraction and downstream summaries/exports.

## Literal extraction and qualifications

Use exact source text and absolute Unicode character offsets, with an end-exclusive boundary. Preserve necessary object, operator, date, quantity, population, conditions, uncertainty and attribution. Retain unavoidable page furniture. CONTEXT_LOCAL is acceptable for a referent actually resolved in the supplied context; never invent a stand-alone named identity from metadata.

For each candidate neighboring clause ask: would omitting it materially change the selected claim, its object, scope, condition or evidential force? If yes, it is meaning-essential and must be preserved in the finding span; if unavailable, record UNREPAIRABLE_IN_CONTEXT. A note elsewhere cannot repair a materially misleading extracted quote. If no, it may be retained as optional context but is not a compulsory part of the atomic finding. Do not harvest a second independent claim merely to satisfy a preferred span.

In particular, absence of a consistent formal measurement/evaluation process does not inherently assert absence of all informal learning. A neighboring learning observation is not automatically mandatory. Conversely, 'no process except in two teams' requires the exception; removing it changes the assertion. This is a semantic test, not a rule to keep or drop everything after a contrast word.

## Ontology and acceptable alternatives

Use positive, adverse_or_qualified, absence or neutral_descriptive with an explicit source-grounded reason. Status-only records are normally neutral; an additional evaluation must be separately supported, not inferred from the fact of implementation.

Reference preparation must record acceptable alternatives where more than one classification is defensible without changing the claim. A neutral quantitative reading and a narrowly adverse/qualified reading of an explicit limited share may both be acceptable, if the evaluative reading is grounded in the source's stated criterion or comparison. A word such as 'only' is not an automatic adverse classifier. A source-grounded limited-capacity observation must not become a claim of overall policy failure.

Preserve a preferred label for display, but do not reject a justified acceptable alternative merely for differing from that preference. This is not unrestricted label choice: every accepted alternative requires its own reason, and contrary or unsupported interpretations remain errors. Freeze any acceptance set before future test answers. No past key or score is changed by these rules.

## Implementation and validation limits

record_contract.py checks record shape, allowed interpretation limits, exact bounded spans, explicit qualifications and supported acceptance-set membership. It cannot establish that a human/AI author's reasons are true, find omitted report findings or validate causal evidence. Semantic verification is still required. The fixed renderer always displays the evidence limit and never changes status facts into outcome headlines.

Development examples are synthetic and exposed. v4.20/v4.21 remain closed and inconclusive. H04 and R01–R04 remain sealed and unread. Any practical workflow validation or fresh-report test requires its own prospective scope; production GO and labor savings remain unestablished.
