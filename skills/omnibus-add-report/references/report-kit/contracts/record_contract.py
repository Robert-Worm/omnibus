"""Prospective record-shape and interpretation safeguards, not an NLP classifier."""
import argparse
import json
from pathlib import Path

VERSION = '4.22'
LIMITS = {
    'IMPLEMENTATION_STATUS': 'STATUS_ONLY',
    'OBSERVED_EMPIRICAL_RESULT': 'DESCRIPTIVE_ONLY',
    'REPORTED_PERCEPTION': 'PERCEPTION_ONLY',
    'EVALUATIVE_VERDICT': 'EVALUATION_ONLY',
    'REPORT_CAUSAL_INFERENCE': 'REPORT_ATTRIBUTED_CAUSAL_INFERENCE',
    'ADOPTED_SYNTHESIS': 'SOURCE_BOUNDED_SYNTHESIS',
}
MILESTONES = {'LEGAL_ESTABLISHMENT','INTRODUCED','COMMENCED','OPERATING',
              'GOVERNANCE_ESTABLISHED','ACTUAL_EXPENDITURE'}
ONTOLOGY = {'positive','adverse_or_qualified','absence','neutral_descriptive'}
RECORD_FIELDS={'contract_version','record_id','decision','source_reason','source','findings','extraction_status','extraction_reason'}
FINDING_FIELDS={'claim_kind','interpretation_limit','status_milestone','independently_verified_effectiveness',
                'claim_reason','ontology_reason','atomicity_reason','referent_resolution','result_start','result_end',
                'result_quote','accepted_ontology_reasons','result_ontology','qualifications','no_essential_qualification_reason'}
LIMIT_TEXT = {
    'STATUS_ONLY': 'Status fact only — does not establish uptake, delivery beyond this milestone, or effectiveness.',
    'DESCRIPTIVE_ONLY': 'Reported observation or calculation — no causal effectiveness conclusion follows by itself.',
    'PERCEPTION_ONLY': 'Reported perception — the source reports the belief, not proof that its causal explanation is true.',
    'EVALUATION_ONLY': "The report's assessment against a criterion — not an additional causal claim.",
    'REPORT_ATTRIBUTED_CAUSAL_INFERENCE': "The report's causal inference — not independently verified causation; retain its qualifications.",
    'SOURCE_BOUNDED_SYNTHESIS': 'Adopted source synthesis — no stronger conclusion than its stated scope.',
}

def nonempty(value): return isinstance(value,str) and bool(value.strip())

def validate_record(record):
    errors=[]
    if not isinstance(record,dict): return ['Record must be an object']
    if set(record)-RECORD_FIELDS: errors.append('Unexpected record fields; arbitrary downstream summaries are not accepted')
    if record.get('contract_version') != VERSION: errors.append('Wrong contract version')
    if not nonempty(record.get('record_id')): errors.append('Missing record ID')
    decision=record.get('decision')
    if decision not in ('HAS_FINDING','NO_FINDING','UNRESOLVED'): errors.append('Invalid decision')
    if not nonempty(record.get('source_reason')): errors.append('Missing source reason')
    source=record.get('source')
    if not isinstance(source,dict): return errors+['Missing source object']
    a,b,q=source.get('context_start'),source.get('context_end'),source.get('context_quote')
    ta,tb=source.get('target_start'),source.get('target_end')
    valid_context=(type(a) is int and type(b) is int and 0<=a<b and isinstance(q,str) and len(q)==b-a)
    if not valid_context: errors.append('Invalid context bounds/text')
    valid_target=valid_context and type(ta) is int and type(tb) is int and a<=ta<tb<=b
    if not valid_target: errors.append('Target must be inside context')
    if not nonempty(source.get('source_id')): errors.append('Missing source ID')
    fs=record.get('findings')
    if not isinstance(fs,list): return errors+['Findings must be an array']
    status=record.get('extraction_status')
    if decision=='HAS_FINDING':
        if fs and status!='COMPLETE_IN_CONTEXT': errors.append('Finding/status mismatch')
        if not fs and (status!='UNREPAIRABLE_IN_CONTEXT' or not nonempty(record.get('extraction_reason'))):
            errors.append('Positive needs findings or explained bounded extraction failure')
    elif fs or status!={'NO_FINDING':'NOT_APPLICABLE','UNRESOLVED':'UNRESOLVED'}.get(decision):
        errors.append('Nonpositive findings/status mismatch')
    seen=set()
    for i,f in enumerate(fs):
        prefix=f'Finding {i}: '
        def err(reason): errors.append(prefix+reason)
        if not isinstance(f,dict): err('Must be an object'); continue
        if set(f)-FINDING_FIELDS: err('Unexpected finding fields; arbitrary effectiveness summaries are not accepted')
        kind=f.get('claim_kind'); ceiling=f.get('interpretation_limit')
        if kind not in LIMITS: err('Invalid claim kind')
        if kind not in LIMITS or ceiling!=LIMITS[kind]: err('Interpretation limit exceeds or differs from claim kind')
        milestone=f.get('status_milestone')
        if kind=='IMPLEMENTATION_STATUS' and milestone not in MILESTONES: err('Explicit status milestone required')
        if kind!='IMPLEMENTATION_STATUS' and milestone is not None: err('Nonstatus record has milestone')
        if type(f.get('independently_verified_effectiveness')) is not bool or f.get('independently_verified_effectiveness'):
            err('This contract cannot certify independently verified effectiveness')
        for name in ('claim_reason','ontology_reason','atomicity_reason'):
            if not nonempty(f.get(name)): err('Missing '+name)
        if f.get('referent_resolution') not in ('SUPPORTED_BY_SUPPLIED_TEXT','CONTEXT_LOCAL'):
            err('Invalid referent resolution')
        s,e,quote=f.get('result_start'),f.get('result_end'),f.get('result_quote')
        bounded=valid_context and type(s) is int and type(e) is int and a<=s<e<=b and isinstance(quote,str)
        if not bounded: err('Invalid finding bounds/text')
        elif q[s-a:e-a]!=quote: err('Nonliteral finding quote')
        if bounded and valid_target and not (s<tb and e>ta): err('Finding does not overlap target')
        if type(s) is int and type(e) is int:
            if (s,e) in seen: err('Duplicate finding span')
            seen.add((s,e))
        accepted=f.get('accepted_ontology_reasons')
        if not isinstance(accepted,dict) or not accepted or any(k not in ONTOLOGY or not nonempty(v) for k,v in accepted.items()):
            err('Invalid source-reasoned ontology acceptance set'); accepted={}
        if f.get('result_ontology') not in accepted: err('Selected ontology not source-supported in acceptance set')
        qualifications=f.get('qualifications')
        if not isinstance(qualifications,list): err('Qualifications must be array'); qualifications=[]
        if not qualifications and not nonempty(f.get('no_essential_qualification_reason')):
            err('Explain absence of essential qualifications')
        for item in qualifications:
            if not isinstance(item,dict): err('Invalid qualification'); continue
            if item.get('role') not in ('ESSENTIAL','OPTIONAL_CONTEXT'): err('Qualification role required')
            if not nonempty(item.get('meaning_reason')): err('Qualification meaning reason required')
            qs,qe,qq=item.get('start'),item.get('end'),item.get('quote')
            qb=valid_context and type(qs) is int and type(qe) is int and a<=qs<qe<=b and isinstance(qq,str)
            if not qb or q[qs-a:qe-a]!=qq: err('Qualification not exact in context')
            if item.get('role')=='ESSENTIAL' and (not qb or not bounded or not s<=qs<qe<=e):
                err('Essential qualification must be inside extracted span, not repaired by a side note')
    return errors

def render_record(record):
    errors=validate_record(record)
    if errors: raise ValueError('; '.join(errors))
    lines=[f"Record {record['record_id']} — {record['decision']}"]
    for f in record['findings']:
        lines += [f"Kind: {f['claim_kind']}",LIMIT_TEXT[f['interpretation_limit']]]
        if f.get('status_milestone'): lines.append('Milestone: '+f['status_milestone'])
        lines += ['Source quotation:',f['result_quote'], 'Classification: '+f['result_ontology'],
                  'Accepted source-grounded classifications: '+', '.join(f['accepted_ontology_reasons'])]
    lines += ['Semantic validity still requires source review; this is not a production certification.']
    return '\n'.join(lines)

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('input',type=Path); args=parser.parse_args()
    data=json.loads(args.input.read_text(encoding='utf-8-sig'))
    results=[{'record_id':r.get('record_id') if isinstance(r,dict) else None,'errors':validate_record(r)} for r in data['records']]
    print(json.dumps({'checks':'STRUCTURE_AND_INTERPRETATION_LIMITS_ONLY','results':results},indent=2))
    if any(r['errors'] for r in results): raise SystemExit(1)

if __name__=='__main__': main()
