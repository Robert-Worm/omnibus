import {admittedLines} from './product-scope.mjs';
import {retiredReportIds} from './catalogue-retirement.mjs';

// Report views are exact source containers, not semantic themes or classifications.
export function reportWorkspaces(framework){
 const lines=admittedLines(framework);
 return (framework.reports||[framework.report]).filter(report=>!retiredReportIds.includes(report.id)).map(report=>({
  id:'report:'+report.id,title:report.id+' · '+report.title,
  reportIds:[report.id],lineIds:lines.filter(line=>(line.report_id??framework.report.id)===report.id).map(line=>line.id),
 })).filter(view=>view.lineIds.length);
}
export function resetReportView(view){
 return {...view,query:'',selectedOnly:false,subjects:[],index:0,top:0,left:0,lastId:''};
}
