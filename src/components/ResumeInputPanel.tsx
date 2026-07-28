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
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers
} from 'lucide-react';
import { ResumeFileItem } from '../types/benchmark';
import { SUPPORTED_MODELS, formatInrPer1M } from '../services/pricingMatrix';
import { processSingleFile, processZipArchive } from '../services/zipPdfHandler';

interface ResumeInputPanelProps {
  onRunBatchBenchmark: (
    resumes: ResumeFileItem[],
    expectedJson: Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
    selectedModelIds: string[],
    systemPrompt: string,
    globalExtractionMode: 'TEXT_ONLY' | 'AUTO' | 'FILE_ONLY'
  ) => void;
  isRunning: boolean;
}

const DEFAULT_INITIAL_JSON = {};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

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
    - doubtful_experience_confidence
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
        1. Explicit gender mention
        2. Pronouns (e.g., he/him → male, she/her → female)
        3. Candidate's first name: If gender is not explicitly mentioned, you MUST infer the gender based on the candidate's first name (e.g., "Pradeep" → male, "Anjali" → female, "Niteesh" → male, "Sarah" → female).
    - Only return null if the first name is completely gender-neutral, ambiguous, or if it is impossible to determine.

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
    - 1 = Candidate experience is entirely in doubtful domains (non-manufacturing, non-industrial)
    - 0 = Candidate has at least one trusted/manual/industrial domain experience, OR has accounting/HR/payroll/back-office experience, OR experience is unclear.

    CRITICAL SEMANTIC CLARIFICATION:
    - "is_doubtful_experience" does NOT mean "fake", "suspicious", or "fabricated" experience.
    - It is simply a technical classification flag for "non-industrial / desk-job / services" domains.
    - Even if the companies are 100% authentic and famous (e.g., Paytm, Razorpay, HDFC Bank, Axis Bank), you MUST still output is_doubtful_experience = 1 if all of their roles belong to the doubtful domains listed below.

    DEFINITION OF DOUBTFUL DOMAINS:
    Banking, Fintech, Insurance, Hospital, Medical Clinic, Pharmacy, Teaching, Academic, Coaching, IT, Software, PMO, Project Coordination, Medical Store, Gym, Fitness, BPO, KPO, Customer Support, Tourism, Hospitality, Restaurants, Food Delivery, E-commerce, Retail Sales, Corporate Sales, Business Development.

    CLASSIFICATION LOGIC STEPS:
    Follow these steps in order to decide the value:

    Step 1: Check for manual, industrial, or manufacturing work.
    - If the candidate has ANY experience in factories, plants, manufacturing units, workshop site work, mechanical, electrical, civil, production engineering, machine operations, maintenance, or similar industrial domains -> Set is_doubtful_experience = 0.

    Step 2: Check for administrative exclusions (accounting, HR, payroll, data entry, back-office).
    - If the candidate has ANY experience working specifically as an Accountant, HR Coordinator, Payroll clerk, Data Entry operator, or Back-Office administrative staff -> Set is_doubtful_experience = 0.
    - Sales, Business Development, Key Account Management, Merchant Acquisition, Payment Gateway integrations, or Zonal/Branch Manager roles in Fintech, E-commerce, or Banking companies are NOT considered accounting, payroll, or back-office work. They are sales/business operations in the Fintech/Banking domain and do NOT trigger this exclusion.

    Step 3: Check if ALL experiences fall under doubtful domains.
    - If ALL identified work experiences are solely within the doubtful domains listed above (e.g. Sales in Fintech/Banks, software development, e-commerce, banking, teaching, BPO) -> Set is_doubtful_experience = 1.
    - Otherwise -> Set is_doubtful_experience = 0.

    Step 4: Handle unclear or low confidence cases.
    - If experience domain is unclear, insufficient, weak, or conflicting -> Set is_doubtful_experience = 0.

    DOUBTFUL_EXPERIENCE_CONFIDENCE:
    - Allowed values ONLY: "high", "medium", or "low"
    - Never return null for doubtful_experience_confidence
    - Return "high" when evidence is clear and certain
    - Return "medium" when the decision is likely but some domain evidence is indirect, or when IT/PMO evidence comes clearly from roles, tools, methods, and responsibilities even if an explicit IT company name is omitted
    - Return "low" when evidence is weak, incomplete, ambiguous, or conflicting
    - If confidence is "low", set is_doubtful_experience = 0

    DOUBTFUL_EXPERIENCE_REASON:
    - Provide a short explanation (1 line) ONLY when is_doubtful_experience = 1
    - Mention the explicit domain evidence, role, or company type used for the decision
    - Example:
      - "Experience only in banking and insurance sector"
      - "Worked only in IT/software roles"
    - If is_doubtful_experience = 0, return doubtful_experience_reason = null

    LOCATION:
    - Return ONLY: City, State, Country
    - Search the entire document (including job experience section) for city/state info. If multiple locations, choose the most recent/current location.
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
    - Return a single JSON object matching the exact structure and keys shown in the template below.
    - Missing values must be null.
    - Do NOT include explanations, introductory text, or concluding text.
    - Do NOT include comments (e.g., // or /* */) inside the JSON.
    - Do NOT use single quotes. All keys and string values must use double quotes.
    - Do NOT include trailing commas.

    EXPECTED JSON OUTPUT STRUCTURE TEMPLATE (Example):
    {
      "name": "Anjali Solanki",
      "email": "anjalisolanki205@gmail.com",
      "phone": "7201055434",
      "country_code": "91",
      "gender": "female",
      "work_stage": "experience",
      "location": "Ahmedabad, Gujarat, India",
      "is_actual_resume": 1,
      "is_doubtful_experience": 0,
      "doubtful_experience_confidence": "high",
      "doubtful_experience_reason": null
    }

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
  const [isPromptExpanded, setIsPromptExpanded] = useState<boolean>(false);

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

  // Active Tab for Content vs Expected JSON
  const [activeInputTab, setActiveInputTab] = useState<'preview' | 'expected'>('preview');

  // Expected JSON state
  const [expectedJsonStr, setExpectedJsonStr] = useState<string>('{\n  \n}');
  const [jsonSyntaxError, setJsonSyntaxError] = useState<string | null>(null);
  const [fileProcessingMsg, setFileProcessingMsg] = useState<string | null>(null);

  // Selected models list (all models selected by default for easy benchmarking!)
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>(SUPPORTED_MODELS.map((m) => m.id));
  const [globalExtractionMode, setGlobalExtractionMode] = useState<'TEXT_ONLY' | 'AUTO' | 'FILE_ONLY'>('AUTO');
  const [isS3Enabled, setIsS3Enabled] = useState<boolean>(false);

  useEffect(() => {
    const checkS3Status = async () => {
      try {
        const res = await fetch('/api/upload');
        if (res.ok) {
          const data = await res.json();
          setIsS3Enabled(data.enabled);
        }
      } catch (err) {
        console.warn('Failed to check S3 status:', err);
      }
    };
    checkS3Status();
  }, []);

  const uploadToS3 = async (fileName: string, base64Data: string, mimeType?: string): Promise<string | null> => {
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, base64Data, mimeType }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.s3Key || null;
      }
    } catch (err) {
      console.error('Failed to upload file to S3:', err);
    }
    return null;
  };

  const [prevActiveResumeId, setPrevActiveResumeId] = useState<string | null>(null);
  const activeItem = loadedResumes[activeResumeIndex];
  const activeItemId = activeItem ? activeItem.id : null;

  if (activeItemId !== prevActiveResumeId) {
    setPrevActiveResumeId(activeItemId);
    if (activeItem) {
      const targetJson = activeItem.expectedJson || DEFAULT_INITIAL_JSON;
      setExpectedJsonStr(
        Object.keys(targetJson).length > 0
          ? JSON.stringify(targetJson, null, 2)
          : '{\n  \n}'
      );
      setJsonSyntaxError(null);
    }
  }

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setFileProcessingMsg('Extracting text & analyzing file...');
    try {
      const file = files[0];
      const lowerName = file.name.toLowerCase();

      if (lowerName.endsWith('.zip')) {
        setFileProcessingMsg('Processing ZIP archive on server...');
        const base64Data = await fileToBase64(file);
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, base64Data, mimeType: file.type }),
        });
        if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
        const data = await res.json();
        if (data.isZip && data.items) {
          setLoadedResumes(data.items);
          setActiveResumeIndex(0);
          setFileProcessingMsg(`Loaded ${data.items.length} resume(s) from ZIP!`);
        } else {
          throw new Error(data.message || 'ZIP extraction failed');
        }
      } else {
        const processedItems: ResumeFileItem[] = [];
        for (let i = 0; i < files.length; i++) {
          const item = await processSingleFile(files[i]);
          processedItems.push(item);
        }

        if (processedItems.length === 0) return;

        if (isS3Enabled) {
          setFileProcessingMsg('Uploading to S3 storage...');
          const s3UploadedItems: ResumeFileItem[] = [];
          for (const item of processedItems) {
            if (item.base64Data) {
              const s3Key = await uploadToS3(item.fileName, item.base64Data, item.mimeType);
              s3UploadedItems.push(s3Key ? { ...item, s3Key } : item);
            } else {
              s3UploadedItems.push(item);
            }
          }
          setLoadedResumes(s3UploadedItems);
          setActiveResumeIndex(0);
          setFileProcessingMsg(`Loaded ${s3UploadedItems.length} file(s) with S3 storage.`);
        } else {
          setLoadedResumes(processedItems);
          setActiveResumeIndex(0);
          setFileProcessingMsg(`Loaded ${processedItems.length} file(s).`);
        }
      }
    } catch (err) {
      console.error('Upload error:', err);
      setFileProcessingMsg(`Upload error: ${err instanceof Error ? err.message : 'Error'}`);
    }
    setTimeout(() => setFileProcessingMsg(null), 3500);
  };

  const handleJsonChange = (val: string) => {
    setExpectedJsonStr(val);
    if (!val.trim()) {
      setJsonSyntaxError(null);
      return;
    }
    try {
      const parsed = JSON.parse(val);
      setJsonSyntaxError(null);
      if (loadedResumes.length > 0 && loadedResumes[activeResumeIndex]) {
        const updated = [...loadedResumes];
        updated[activeResumeIndex].expectedJson = parsed;
        setLoadedResumes(updated);
      }
    } catch (err) {
      setJsonSyntaxError(err instanceof Error ? err.message : 'Invalid JSON');
    }
  };

  const toggleModel = (id: string) => {
    setSelectedModelIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const selectAllModels = () => setSelectedModelIds(SUPPORTED_MODELS.map((m) => m.id));
  const deselectAllModels = () => setSelectedModelIds([]);

  const handleSubmit = () => {
    if (jsonSyntaxError || loadedResumes.length === 0) return;
    try {
      const parsedExpected = expectedJsonStr.trim() ? JSON.parse(expectedJsonStr) : {};
      const cleanedResumes = loadedResumes.map(item => {
        if (item.s3Key) {
          const { base64Data, ...rest } = item;
          return rest;
        }
        return item;
      });
      onRunBatchBenchmark(cleanedResumes, parsedExpected, selectedModelIds, systemPrompt, globalExtractionMode);
    } catch {
      setJsonSyntaxError('Please fix JSON syntax errors first.');
    }
  };

  const providersGroup = [
    { providerId: 'google', name: 'Google AI Direct' },
    { providerId: 'openai', name: 'OpenAI Direct' },
    { providerId: 'anthropic', name: 'Anthropic Direct' },
    { providerId: 'mistral', name: 'Mistral Direct' },
    { providerId: 'vertex', name: 'Google Vertex AI' },
    { providerId: 'azure', name: 'Azure AI' },
    { providerId: 'bedrock', name: 'AWS Bedrock' },
  ];

  const currentActiveResume = loadedResumes[activeResumeIndex];

  return (
    <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 backdrop-blur-md shadow-lg">
      {/* 1. Sleek Upload & Mode Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-500/20 shrink-0">
            <Upload className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-white">AI Model Benchmark Setup</h2>
              {isS3Enabled && (
                <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[9px] font-bold text-cyan-300 border border-cyan-500/30">
                  S3 ACTIVE
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Upload PDF / ZIP resumes, select models, and run parallel benchmarking.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {/* Mode Chips */}
          <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950 p-0.5 text-[10px]">
            {(['AUTO', 'TEXT_ONLY', 'FILE_ONLY'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setGlobalExtractionMode(mode)}
                className={`rounded-md px-2 py-1 font-bold transition-all ${
                  globalExtractionMode === mode
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {mode === 'AUTO' ? 'Auto Mode' : mode === 'TEXT_ONLY' ? 'Text Only' : 'Direct File'}
              </button>
            ))}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.zip,.txt,.json,.docx,.doc,.png,.jpg,.jpeg,.webp"
            multiple
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-4 py-1.5 text-xs font-bold text-slate-950 shadow-md shadow-cyan-500/20 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload File / ZIP</span>
          </button>
        </div>
      </div>

      {/* File status alert */}
      {fileProcessingMsg && (
        <div className="rounded-lg bg-cyan-950/40 border border-cyan-500/30 p-2 text-xs text-cyan-300 flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
          <span>{fileProcessingMsg}</span>
        </div>
      )}

      {/* Batch Resume Tabs */}
      {loadedResumes.length > 1 && (
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs border-b border-slate-800/80">
          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider shrink-0 pr-1">
            Resumes ({loadedResumes.length}):
          </span>
          {loadedResumes.map((res, idx) => (
            <button
              key={res.id}
              onClick={() => setActiveResumeIndex(idx)}
              className={`rounded-lg px-2.5 py-1 text-xs font-mono shrink-0 transition-all ${
                activeResumeIndex === idx
                  ? 'bg-indigo-500 text-white font-bold shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {res.fileName}
            </button>
          ))}
        </div>
      )}

      {/* 2. Sleek Compact System Prompt Accordion */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-bold text-slate-200">System Extraction Prompt</span>
            <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 font-mono">
              Preset: {selectedPreset}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-[11px] text-slate-300 focus:outline-none cursor-pointer"
            >
              {PRESET_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => setIsPromptExpanded(!isPromptExpanded)}
              className="flex items-center space-x-1 rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-xs font-semibold text-cyan-300 border border-slate-700 transition-colors"
            >
              <span>{isPromptExpanded ? 'Hide Prompt' : 'Edit Prompt'}</span>
              {isPromptExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {isPromptExpanded && (
          <div className="space-y-2 pt-1 animate-fadeIn">
            <textarea
              value={systemPrompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2.5 font-mono text-xs text-cyan-100 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
              placeholder="Enter custom prompt instructions for AI models..."
            />
            <div className="flex justify-end">
              <button
                onClick={handleClearPrompt}
                className="text-[10px] text-slate-400 hover:text-cyan-300 underline"
              >
                Clear Prompt Text
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Compact Tabbed Content & Expected JSON View */}
      {loadedResumes.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-2">
          {/* Tabs header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveInputTab('preview')}
                className={`flex items-center space-x-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                  activeInputTab === 'preview'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Extracted Text Preview ({currentActiveResume?.fileName})</span>
              </button>

              <button
                onClick={() => setActiveInputTab('expected')}
                className={`flex items-center space-x-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                  activeInputTab === 'expected'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code2 className="h-3.5 w-3.5" />
                <span>Expected Ground Truth JSON</span>
              </button>
            </div>

            {currentActiveResume && (
              <span className="text-[10px] text-slate-400 font-mono">
                {currentActiveResume.extractionMode === 'TEXT_PROMPT' ? '⚡ Clean Text' : '📷 Multimodal PDF'}
              </span>
            )}
          </div>

          {/* Active Tab Content */}
          {activeInputTab === 'preview' ? (
            <textarea
              value={currentActiveResume?.extractedText || ''}
              onChange={(e) => {
                if (loadedResumes.length > 0) {
                  const updated = [...loadedResumes];
                  updated[activeResumeIndex].extractedText = e.target.value;
                  setLoadedResumes(updated);
                }
              }}
              rows={4}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2.5 font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
              placeholder="Extracted text preview..."
            />
          ) : (
            <textarea
              value={expectedJsonStr}
              onChange={(e) => handleJsonChange(e.target.value)}
              rows={4}
              className={`w-full rounded-lg border p-2.5 font-mono text-xs text-purple-200 placeholder-slate-600 focus:outline-none ${
                jsonSyntaxError ? 'border-red-500/50 bg-red-950/10' : 'border-slate-800 bg-slate-900'
              }`}
              placeholder="Paste ground truth JSON object here..."
            />
          )}
        </div>
      )}

      {/* 4. Lightweight Compact Model Selector */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Select AI Models ({selectedModelIds.length} / {SUPPORTED_MODELS.length})
            </h3>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <button onClick={selectAllModels} className="text-cyan-400 hover:text-cyan-300 font-semibold">
              Select All
            </button>
            <span className="text-slate-700">|</span>
            <button onClick={deselectAllModels} className="text-slate-400 hover:text-slate-300 font-semibold">
              Deselect All
            </button>
          </div>
        </div>

        {/* Compact Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {SUPPORTED_MODELS.map((model) => {
            const isChecked = selectedModelIds.includes(model.id);
            return (
              <div
                key={model.id}
                onClick={() => toggleModel(model.id)}
                className={`rounded-xl p-2 cursor-pointer transition-all border flex flex-col justify-between space-y-1 text-xs ${
                  isChecked
                    ? 'border-cyan-500/60 bg-cyan-950/30 text-white shadow-sm'
                    : 'border-slate-800/80 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] truncate text-white">{model.name}</span>
                  {isChecked ? (
                    <CheckSquare className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  ) : (
                    <Square className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                  )}
                </div>

                <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono pt-1 border-t border-slate-800/60">
                  <span>{model.providerName.split(' ')[0]}</span>
                  <span className="text-emerald-400">{formatInrPer1M(model.inputCostPer1M)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Sleek Run Action Trigger */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
        <div className="text-xs text-slate-400 font-mono">
          {loadedResumes.length > 0 ? (
            <>Target: <strong className="text-cyan-300">{loadedResumes.length} File(s)</strong> × <strong className="text-purple-300">{selectedModelIds.length} Model(s)</strong> = {loadedResumes.length * selectedModelIds.length} Parallel Runs</>
          ) : (
            <>Upload a PDF resume above to run live benchmark</>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={isRunning || selectedModelIds.length === 0 || !!jsonSyntaxError || loadedResumes.length === 0}
          className={`flex items-center space-x-2 rounded-xl px-6 py-2.5 text-xs font-extrabold text-white shadow-lg transition-all ${
            isRunning || selectedModelIds.length === 0 || !!jsonSyntaxError || loadedResumes.length === 0
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:opacity-90 shadow-cyan-500/20 active:scale-95'
          }`}
        >
          {isRunning ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin text-cyan-300" />
              <span>Running Benchmarks...</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4 text-cyan-300 fill-cyan-300" />
              <span>Run Live Benchmark ({loadedResumes.length * selectedModelIds.length} Runs)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
