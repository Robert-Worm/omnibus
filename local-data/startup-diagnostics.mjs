// Keep diagnostics separate from exception text/properties, paths and source data.
// Only our own control-flow checkpoints may select a public startup reason.
const reasons=new Set(['start-options','settings','node-version','package-location',
  'package-integrity','web-build','database-open','publication','web-readiness','listener']);
const failures=new WeakMap();

export function startupCheck(reason,action){
  const failed=error=>{
    // Preserve existing programmatic exceptions and the innermost checkpoint.
    const failure=error instanceof Error?error:Error('Startup check failed');
    if(!failures.has(failure))failures.set(failure,reasons.has(reason)?reason:'startup');
    throw failure;
  };
  try{
    const result=action();
    return result instanceof Promise?result.catch(failed):result;
  }catch(error){return failed(error);}
}

export function startupFailureReason(error){
  return failures.get(error)??'startup';
}
