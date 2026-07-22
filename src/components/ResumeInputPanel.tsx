'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  FileText,
  Code2,
  CheckSquare,
  Square,
  RefreshCw,
  AlertCircle,
  MessageSquare,
  Upload,
  Archive,
  CheckCircle2,
  FileCode,
  FileImage,
} from 'lucide-react';
import { AIModel, ResumeFileItem } from '../types/benchmark';
import { SUPPORTED_MODELS, formatInrPer1M } from '../services/pricingMatrix';
import { processSingleFile, processZipArchive } from '../services/zipPdfHandler';

interface ResumeInputPanelProps {
  onRunBatchBenchmark: (
    resumes: ResumeFileItem[],
    expectedJson: Record<string, any>,
    selectedModelIds: string[],
    systemPrompt: string
  ) => void;
  isRunning: boolean;
}

// Blank Initial JSON schema by default
const DEFAULT_INITIAL_JSON = {};

const PRESET_OPTIONS = [
  { id: 'initial-parsing', name: '1. Initial Parsing' },
  { id: 'manual-resume-parce', name: '2. Manual Resume Parce' },
  { id: 'generate-job-description', name: '3. Generate Job Description' },
  { id: 'suggest-job-salary', name: '4. Suggest Job Salary' },
  { id: 'exprince-parsing', name: '5. Experience Parsing' },
  { id: 'skill-parsing', name: '6. Skill Parsing' },
  { id: 'manpower-report', name: '7. Manpower Report' },
  { id: 'custom', name: 'Custom / Edited Prompt' },
];

const PRESET_PROMPTS: Record<string, string> = {
  'initial-parsing': `You are a resume parsing AI.

Extract the following fields and return ONLY valid JSON:
- name
- email
- phone
- country_code
- gender
- work_stage
- location
- is_actual_resume
- is_doubtful_experience
- doubtful_experience_reason

STRICT RULES:

NAME:
- Return only first name and surname
- If the name is in ALL CAPITAL letters, convert it to Proper Case
- Example: "PARTH PATEL" → "Parth Patel"
- Do not include middle names or titles

EMAIL:
- Return ONLY a valid email address
- If the email is invalid or missing, return null

PHONE:
- Return ONLY digits
- Return ONLY ONE mobile number
- NEVER remove leading digits from a phone number if the original normalized number itself is already a valid mobile-length number for the detected country
- Remove country code from PHONE ONLY when the international prefix is explicitly present and confidently separable
- If multiple numbers exist, return the latest/current/mobile number only
- Ignore landline, fax, office, home, residence, alternate, and WhatsApp numbers unless explicitly marked as mobile
- Prefer numbers labeled Mobile, Mob, Cell, or M
- Normalize by removing spaces, dashes, brackets, extensions, and "+"
- Validate ONLY normalized digits; ignore formatting style, separators, brackets, spacing, or country-specific display patterns
- NEVER infer country code from formatting style or leading digits alone
- Extract country code ONLY when explicitly present with "+" , "00" prefix, or a clearly separable international format
- Remove country code from PHONE after extraction
- Never keep country code inside PHONE
- If no explicit country code exists, treat the full normalized number as the local/national mobile number
- If local/mobile format matches resume location country, accept it and use that country's calling code
- Validate mainly by mobile-like structure and valid national number length
- Do NOT over-reject numbers based on telecom prefixes or uncertain numbering rules
- Never return partial, broken, truncated, or incomplete numbers
- If no valid mobile number exists, return null

COUNTRY_CODE:
- Return ONLY numeric country calling code without "+"
- COUNTRY_CODE and PHONE must always belong to the same country
- Prefer order:
    1. Explicit country code from phone
    2. Resume location/address country
    3. Last working country
- If phone is valid for resume location country and no explicit country code exists, use resume country's calling code
- Never infer country code from formatting style or leading digits alone
- Return null only if country cannot be determined
- Never guess or assume

GENDER:
- Allowed values ONLY:
- "male"
- "female"
- "other"
- Detect from:
- Explicit gender mention
- Pronouns (he/him → male, she/her → female)
- If gender cannot be confidently determined, return null
- Never guess based on name alone

WORK_STAGE:
- Allowed values ONLY:
- "intern"
- "fresher"
- "experience"
- You MUST carefully read the COMPLETE experience/employment section before deciding work_stage
- Do NOT classify as "intern" or "fresher" only because internship, trainee, apprenticeship, academic project/training, or current education is mentioned
- Many resumes contain BOTH internship/training experience AND real employment experience
- Your task is to decide whether the candidate has ANY valid professional work experience
- PRIORITY RULE: Real professional experience ALWAYS overrides internship
- If even ONE valid professional employment experience is found anywhere in the resume, work_stage MUST be "experience"

- "experience":
    - Use if ANY of the following exists anywhere in the resume:
        - at least one real company/employer with job responsibilities, work duties, production/operations/tasks, accounting/technical/engineering/business functions, client/project handling, payroll/GST/maintenance/manufacturing/quality related work
        - any employment duration such as 6 months, 1 year, 2 years, worked from 2022-2024, currently working, or present
        - any non-intern professional designation such as Engineer, Operator, Accountant, Technician, Executive, Supervisor, Associate, Manager, Analyst, Developer, CNC Operator, Production Engineer, Quality Engineer, Maintenance Engineer, or Machine Operator
        - explicit claims of work experience such as "2 years experience", "worked in", "currently employed", "hands-on experience", or "professional experience"
        - both internship and real employment are present; in such cases IGNORE internship for final classification and PRIORITIZE full-time or professional employment
    - Employment dates are NOT mandatory if company name and responsibilities are present
    - A clear employer/company with either a job title or explicit responsibilities is sufficient
    - Local businesses, agencies, shops, factories, medical stores, and manufacturing units count as valid employers
    - If degree is completed (e.g., "High School", "Diploma", Bachelors, Masters, PhD) but graduation year is missing, do NOT block classification

- "intern":
    - Use ONLY if the resume contains ONLY internships, apprenticeships, or trainings
    - AND no real employer-based professional experience exists
    - AND no evidence of full-time job responsibilities exists

- "fresher":
    - Use ONLY if no internship exists
    - AND no professional employment exists
    - AND the resume mainly contains education, projects, certifications, skills, or college activities
    - Academic research projects, master’s thesis work, lab work, certifications, online courses, and paper presentations do NOT count as experience

- Negative Constraints:
    - Do NOT treat research projects, certifications, or academic work as professional experience
    - Do NOT classify as "intern" or "fresher" if any valid professional employment exists anywhere in the resume
    - Never assume

IS_DOUBTFUL_EXPERIENCE:
- Return ONLY 0 or 1
- 1 = Candidate experience is in doubtful domains
- 0 = Candidate has at least one trusted/manual/industrial domain experience

DEFINITION:
Set is_doubtful_experience = 1 IF:
- ALL detected work experience falls under non manufacturing / non industrial domains such as: Banking / Insurance / Hospital / Teaching / Academic / Coaching / IT / Software / Medical Store / Gym / Fitness / BPO / KPO / Tourism / Hospitality / Restaurants / Food Delivery

otherwise, set is_doubtful_experience = 0

IMPORTANT RULES:
- Dont classify as doubtful if there is ANY experience in accounting, HR, payroll, data entry, back office related work as set is_doubtful_experience = 0 even if the candidate has experience in other domains as well
If experience domain is unclear or insufficient → return null
- Never guess
- Classification must be based only on explicit company, role, or responsibilities

DOUBTFUL_EXPERIENCE_REASON:
- Provide a short explanation (1 line) ONLY when is_doubtful_experience = 1
- Example:
- "Experience only in banking and insurance sector"
- "Worked only in IT/software roles"
- If is_doubtful_experience = 0 or null → return null

LOCATION:
- Return ONLY: City, State, Country
- Ignore village, taluka, tehsil, block names
- If district is mentioned, treat it as City
- Resolve State and Country from the district
- Format priority:
- City, State, Country
- State, Country
- Country
- If City is not found, use the closest available location (administrative_area_level_3) as City and resolve State and Country
- If only State and Country are confidently found, return "State, Country"
- If only Country is confidently found, return "Country"
- Never guess

IS_ACTUAL_RESUME:
- Return ONLY 0 or 1
- 1 = actual resume document
- 0 = fake document

Clarification:
- If the document is titled "Cover Letter" (or equivalent) and only briefly summarizes the candidate profile or experience without structured resume sections, set is_actual_resume = 0

Rules:
- Set is_actual_resume = 1 IF the document contains a resume or CV section anywhere in the document
- A document MAY contain a cover letter on one or more pages and still be an actual resume
- Set is_actual_resume = 0 ONLY IF the document contains NO resume or CV content at all
- If the document consists ONLY of a cover letter with no resume/CV sections, set is_actual_resume = 0

OUTPUT RULES:
- Return a single JSON object
- Missing values must be null
- Do NOT include explanations
- Do NOT include markdown
- Do NOT include extra text

If the document is an image or scan, perform OCR first.`,
  'manual-resume-parce': '',
  'generate-job-description': '',
  'suggest-job-salary': '',
  'exprince-parsing': '',
  'skill-parsing': '',
  'manpower-report': '',
  'custom': '',
};

export const ResumeInputPanel: React.FC<ResumeInputPanelProps> = ({
  onRunBatchBenchmark,
  isRunning,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [systemPrompt, setSystemPrompt] = useState<string>(PRESET_PROMPTS['initial-parsing']);
  const [selectedPreset, setSelectedPreset] = useState<string>('initial-parsing');

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    if (presetId !== 'custom') {
      setSystemPrompt(PRESET_PROMPTS[presetId] || '');
    }
  };

  const handlePromptChange = (val: string) => {
    setSystemPrompt(val);
    const matchingPreset = Object.entries(PRESET_PROMPTS).find(
      ([key, promptText]) => key !== 'custom' && promptText === val
    );
    if (matchingPreset) {
      setSelectedPreset(matchingPreset[0]);
    } else {
      setSelectedPreset('custom');
    }
  };

  const handleClearPrompt = () => {
    setSystemPrompt('');
    setSelectedPreset('custom');
  };

  // Loaded Resumes List
  const [loadedResumes, setLoadedResumes] = useState<ResumeFileItem[]>([]);
  const [activeResumeIndex, setActiveResumeIndex] = useState<number>(0);

  // Start with blank JSON string
  const [expectedJsonStr, setExpectedJsonStr] = useState<string>('{\n  \n}');
  const [jsonSyntaxError, setJsonSyntaxError] = useState<string | null>(null);
  const [fileProcessingMsg, setFileProcessingMsg] = useState<string | null>(null);

  // Selected models list (empty by default)
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);


  // Sync expected JSON when active resume tab changes
  useEffect(() => {
    if (loadedResumes.length > 0 && loadedResumes[activeResumeIndex]) {
      const activeItem = loadedResumes[activeResumeIndex];
      const targetJson = activeItem.expectedJson || DEFAULT_INITIAL_JSON;
      setExpectedJsonStr(
        Object.keys(targetJson).length > 0
          ? JSON.stringify(targetJson, null, 2)
          : '{\n  \n}'
      );
      setJsonSyntaxError(null);
    }
  }, [activeResumeIndex, loadedResumes.length]);

  // Direct PDF or ZIP file drop/select handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setFileProcessingMsg('Analyzing PDF content & extracting text...');
    try {
      const file = files[0];
      const lowerName = file.name.toLowerCase();

      if (lowerName.endsWith('.zip')) {
        const extractedItems = await processZipArchive(file);
        if (extractedItems.length === 0) {
          setFileProcessingMsg('No PDF or TXT files found inside ZIP archive.');
        } else {
          setLoadedResumes(extractedItems);
          setActiveResumeIndex(0);
          setFileProcessingMsg(`Loaded ${extractedItems.length} PDF resumes!`);
        }
      } else {
        const newItems: ResumeFileItem[] = [];
        for (let i = 0; i < files.length; i++) {
          const item = await processSingleFile(files[i]);
          newItems.push(item);
        }
        setLoadedResumes(newItems);
        setActiveResumeIndex(0);
        setFileProcessingMsg(`Loaded ${newItems.length} PDF resume file(s).`);
      }
    } catch (err: any) {
      console.error('File upload error:', err);
      setFileProcessingMsg(`Upload error: ${err?.message || 'Failed to process file'}`);
    }

    setTimeout(() => setFileProcessingMsg(null), 4000);
  };

  // Expected JSON text edit handler with syntax check
  const handleJsonChange = (val: string) => {
    setExpectedJsonStr(val);
    if (!val.trim()) {
      setJsonSyntaxError(null);
      return;
    }

    try {
      const parsed = JSON.parse(val);
      setJsonSyntaxError(null);

      // Save to current active resume state
      if (loadedResumes.length > 0 && loadedResumes[activeResumeIndex]) {
        const updated = [...loadedResumes];
        updated[activeResumeIndex].expectedJson = parsed;
        setLoadedResumes(updated);
      }
    } catch (err: any) {
      setJsonSyntaxError(err?.message || 'Invalid JSON syntax');
    }
  };

  // Model toggle
  const toggleModel = (id: string) => {
    setSelectedModelIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const selectAllModels = () => {
    setSelectedModelIds(SUPPORTED_MODELS.map((m) => m.id));
  };

  const deselectAllModels = () => {
    setSelectedModelIds([]);
  };

  // Submit benchmark run
  const handleSubmit = () => {
    if (jsonSyntaxError || loadedResumes.length === 0) return;
    try {
      const parsedExpected = expectedJsonStr.trim() ? JSON.parse(expectedJsonStr) : {};
      onRunBatchBenchmark(loadedResumes, parsedExpected, selectedModelIds, systemPrompt);
    } catch (err) {
      setJsonSyntaxError('Please resolve JSON syntax errors before running benchmark.');
    }
  };

  // Group models by provider in required sequence: Google Direct, OpenAI Direct, Anthropic Direct, Mistral AI Direct, Vertex AI, Azure AI, AWS Bedrock
  const providersGroup = [
    { providerId: 'google', name: 'Google AI Direct' },
    { providerId: 'openai', name: 'OpenAI Direct' },
    { providerId: 'anthropic', name: 'Anthropic Direct' },
    { providerId: 'mistral', name: 'Mistral AI Direct' },
    { providerId: 'vertex', name: 'Google Vertex AI' },
    { providerId: 'azure', name: 'Microsoft Azure AI' },
    { providerId: 'bedrock', name: 'AWS Bedrock' },
  ];

  const currentActiveResume = loadedResumes[activeResumeIndex];

  return (
    <div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
      {/* 1. Header & File Upload Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <FileText className="h-5 w-5 text-cyan-400" />
              <span>1. Upload PDF / ZIP Resumes & Ground Truth</span>
            </h2>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
              Live API Mode
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Upload PDF files or a <strong>ZIP archive containing up to 100 resumes</strong>.
          </p>
        </div>

        {/* Upload Buttons */}
        <div className="flex items-center space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.zip,.txt,.json"
            multiple
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:opacity-90 px-6 py-2.5 text-xs font-extrabold text-white shadow-xl shadow-cyan-600/20 transition-all active:scale-95"
          >
            <Upload className="h-4 w-4" />
            <span>Upload PDF / ZIP (Up to 100 Resumes)</span>
          </button>
        </div>
      </div>

      {/* File processing message */}
      {fileProcessingMsg && (
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/30 p-3 text-xs text-cyan-300 flex items-center space-x-2 animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
          <span>{fileProcessingMsg}</span>
        </div>
      )}

      {/* Multi-Resume Batch Tabs (ONLY rendered when multiple files in ZIP uploaded) */}
      {loadedResumes.length > 1 && (
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-indigo-300 font-bold">
            <span className="flex items-center space-x-1.5">
              <Archive className="h-4 w-4 text-indigo-400" />
              <span>Batch Resumes Loaded ({loadedResumes.length} PDF Files)</span>
            </span>
            <span className="text-[11px] text-slate-400">Click tab to select active resume</span>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {loadedResumes.map((resItem, idx) => (
              <button
                key={resItem.id}
                onClick={() => setActiveResumeIndex(idx)}
                className={`rounded-lg px-2.5 py-1 text-xs font-mono transition-all flex items-center space-x-1 ${
                  activeResumeIndex === idx
                    ? 'bg-indigo-500 text-white font-bold shadow-md shadow-indigo-500/30'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <FileText className="h-3 w-3" />
                <span>{resItem.fileName}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. System Extraction Prompt Box */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <label className="text-xs font-bold text-cyan-300 flex items-center space-x-1.5 uppercase tracking-wider">
            <MessageSquare className="h-4 w-4 text-cyan-400" />
            <span>System Extraction Prompt (AI Instructions)</span>
          </label>
          
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-slate-400 font-semibold">Select AI Task Preset:</span>
            <select
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-cyan-300 focus:border-cyan-500 focus:outline-none cursor-pointer hover:border-slate-700 transition-all font-semibold"
            >
              {PRESET_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id} className="bg-slate-950 text-slate-200">
                  {opt.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleClearPrompt}
              className="text-[10px] text-slate-400 hover:text-cyan-300 underline shrink-0 ml-1"
            >
              Clear Prompt
            </button>
          </div>
        </div>
        <textarea
          value={systemPrompt}
          onChange={(e) => handlePromptChange(e.target.value)}
          rows={6}
          className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-cyan-100 placeholder-slate-600 focus:border-cyan-500 focus:outline-none min-h-[140px] resize-y"
          placeholder="Enter prompt instructions for AI models..."
        />
      </div>

      {/* 3. Text Input Grid with Mode Indicator & Dedicated Ground Truth JSON */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Input Text Data / PDF Mode Indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <FileText className="h-4 w-4 text-emerald-400" />
              <span>
                Content Preview: <strong className="text-white font-mono">{currentActiveResume?.fileName || 'No file selected'}</strong>
              </span>
            </label>

            {currentActiveResume && (
              currentActiveResume.extractionMode === 'TEXT_PROMPT' ? (
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                  <FileCode className="h-3 w-3" />
                  <span>Text Mode</span>
                </span>
              ) : (
                <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400 border border-amber-500/30 flex items-center space-x-1">
                  <FileImage className="h-3 w-3" />
                  <span>Multimodal Mode</span>
                </span>
              )
            )}
          </div>
          <textarea
            value={currentActiveResume?.extractedText || ''}
            onChange={(e) => {
              if (loadedResumes.length > 0) {
                const updated = [...loadedResumes];
                updated[activeResumeIndex].extractedText = e.target.value;
                setLoadedResumes(updated);
              }
            }}
            rows={10}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-200 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
            placeholder="Parsed PDF text content will appear here when a file is uploaded above..."
          />
        </div>

        {/* Right: Expected Ground Truth JSON for Active Selected Resume (BLANK BY DEFAULT) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <Code2 className="h-4 w-4 text-purple-400" />
              <span>
                Expected Ground Truth JSON {currentActiveResume?.fileName ? `for: ${currentActiveResume.fileName}` : ''}
              </span>
            </label>
            {jsonSyntaxError && (
              <span className="text-[11px] text-red-400 flex items-center space-x-1 font-semibold">
                <AlertCircle className="h-3 w-3" />
                <span>JSON Syntax Error</span>
              </span>
            )}
          </div>
          <textarea
            value={expectedJsonStr}
            onChange={(e) => handleJsonChange(e.target.value)}
            rows={10}
            className={`w-full rounded-xl border p-3 font-mono text-xs text-purple-200 placeholder-slate-600 focus:outline-none ${
              jsonSyntaxError
                ? 'border-red-500/50 bg-red-950/10'
                : 'border-slate-800 bg-slate-950 focus:border-purple-500'
            }`}
            placeholder="Paste expected JSON object here or leave blank for schema extraction..."
          />
        </div>
      </div>

      {/* 4. Model Selector Grid */}
      <div className="space-y-3 border-t border-slate-800 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold text-white tracking-wide uppercase">
              2. Select AI Models to Benchmark ({selectedModelIds.length} Selected)
            </h3>
            <p className="text-[11px] text-slate-400">
              Evaluates live API latency, token cost, and JSON field accuracy across all {loadedResumes.length} PDF resumes.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={selectAllModels}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
            >
              Select All
            </button>
            <span className="text-slate-700">|</span>
            <button
              onClick={deselectAllModels}
              className="text-xs text-slate-400 hover:text-slate-300 font-medium"
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* Model Checkbox Cards Grouped by Provider */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providersGroup.map((group) => {
            const modelsInGroup = SUPPORTED_MODELS.filter((m) => m.provider === group.providerId);
            if (modelsInGroup.length === 0) return null;

            return (
              <div
                key={group.providerId}
                className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3 space-y-2"
              >
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {group.name}
                </div>
                <div className="space-y-1.5">
                  {modelsInGroup.map((model) => {
                    const isChecked = selectedModelIds.includes(model.id);
                    return (
                      <div
                        key={model.id}
                        onClick={() => toggleModel(model.id)}
                        className={`flex items-center justify-between rounded-lg p-2 cursor-pointer transition-all border ${
                          isChecked
                            ? 'bg-cyan-500/10 border-cyan-500/30 text-white'
                            : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          {isChecked ? (
                            <CheckSquare className="h-4 w-4 text-cyan-400 shrink-0" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-600 shrink-0" />
                          )}
                          <div>
                            <div className="text-xs font-semibold text-slate-200">
                              {model.name}
                            </div>
                            <div className="text-[10px] text-emerald-400/90 font-mono">
                              {formatInrPer1M(model.inputCostPer1M)}/1M in · {formatInrPer1M(model.outputCostPer1M)}/1M out
                            </div>
                          </div>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${model.badgeColor}`}>
                          {model.providerName.split(' ')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Action Trigger Button */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-slate-400 font-mono">
          {loadedResumes.length > 0 ? (
            <>Ready to test: <strong className="text-cyan-300">{loadedResumes.length} PDF Resume(s)</strong> × <strong className="text-purple-300">{selectedModelIds.length} AI Models</strong> = {loadedResumes.length * selectedModelIds.length} Total Runs</>
          ) : (
            <>Upload a PDF resume using the top button to start benchmark</>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={isRunning || selectedModelIds.length === 0 || !!jsonSyntaxError || loadedResumes.length === 0}
          className={`flex items-center space-x-2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-xl transition-all ${
            isRunning || selectedModelIds.length === 0 || !!jsonSyntaxError || loadedResumes.length === 0
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:opacity-90 shadow-cyan-500/20 active:scale-[0.98]'
          }`}
        >
          {isRunning ? (
            <>
              <RefreshCw className="h-5 w-5 animate-spin text-cyan-300" />
              <span>Benchmarking {loadedResumes.length} Resume(s)...</span>
            </>
          ) : (
            <>
              <Play className="h-5 w-5 text-cyan-300 fill-cyan-300" />
              <span>Run Live Multi-Model Benchmark ({loadedResumes.length * selectedModelIds.length} Evaluation Runs)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
