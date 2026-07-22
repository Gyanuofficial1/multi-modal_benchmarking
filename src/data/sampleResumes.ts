import { SampleResumeItem } from '../types/benchmark';

export const SAMPLE_RESUMES: SampleResumeItem[] = [
  {
    id: 'fullstack-engineer',
    title: 'Senior Full Stack Engineer Resume',
    category: 'Software Engineering',
    rawResumeText: `
Johnathan Doe
San Francisco, CA | john.doe@email.com | (555) 019-2831 | github.com/johndoe | linkedin.com/in/johndoe

PROFESSIONAL SUMMARY
Experienced Senior Full Stack Engineer with 7+ years of expertise building scalable web applications using React, Next.js, Node.js, and TypeScript. Proven track record in microservices architecture, AWS cloud deployments, and REST/GraphQL API design.

WORK EXPERIENCE
Senior Full Stack Developer | TechCorp Solutions | San Francisco, CA
March 2021 – Present
- Led team of 6 engineers in migrating legacy monolith to Next.js and Node.js microservices, boosting page speed by 45%.
- Architected real-time analytics dashboard servicing 2M+ active daily users using WebSockets, Redis, and PostgreSQL.
- Reduced AWS hosting infrastructure cost by 28% through Docker container optimization and serverless Lambda functions.

Full Stack Engineer | CloudInnovate Inc | Austin, TX
June 2017 – February 2021
- Developed responsive web applications using React, Redux, Tailwind CSS, and Express.js.
- Integrated Stripe payment processing and OAuth2 authentication, handling $5M+ monthly transactions.
- Wrote automated CI/CD pipelines in GitHub Actions, achieving 98% test coverage with Jest and Cypress.

TECHNICAL SKILLS
Languages: TypeScript, JavaScript, Python, SQL, HTML5, CSS3
Frameworks & Libraries: React, Next.js, Node.js, Express, Tailwind CSS, GraphQL, Prisma
Databases & Cloud: PostgreSQL, MongoDB, Redis, AWS (S3, Lambda, EC2), Docker, Kubernetes, Git

EDUCATION
Bachelor of Science in Computer Science
University of Texas at Austin | Graduated May 2017 (GPA 3.8/4.0)

CERTIFICATIONS
- AWS Certified Solutions Architect – Associate (2022)
- Meta Certified Senior Front-End Developer (2021)
    `.trim(),
    expectedJson: {
      candidate_name: 'Johnathan Doe',
      contact_info: {
        email: 'john.doe@email.com',
        phone: '(555) 019-2831',
        location: 'San Francisco, CA',
        github: 'github.com/johndoe',
        linkedin: 'linkedin.com/in/johndoe',
      },
      summary: 'Experienced Senior Full Stack Engineer with 7+ years of expertise building scalable web applications using React, Next.js, Node.js, and TypeScript.',
      years_of_experience: 7,
      skills: [
        'TypeScript',
        'JavaScript',
        'Python',
        'React',
        'Next.js',
        'Node.js',
        'Express',
        'Tailwind CSS',
        'PostgreSQL',
        'MongoDB',
        'Redis',
        'AWS',
        'Docker',
        'GraphQL',
      ],
      work_experience: [
        {
          title: 'Senior Full Stack Developer',
          company: 'TechCorp Solutions',
          location: 'San Francisco, CA',
          start_date: 'March 2021',
          end_date: 'Present',
          key_achievements: [
            'Migrated legacy monolith to Next.js and Node.js boosting page speed by 45%',
            'Architected real-time analytics dashboard servicing 2M+ daily users',
            'Reduced AWS infrastructure cost by 28%',
          ],
        },
        {
          title: 'Full Stack Engineer',
          company: 'CloudInnovate Inc',
          location: 'Austin, TX',
          start_date: 'June 2017',
          end_date: 'February 2021',
          key_achievements: [
            'Developed responsive web apps using React and Express',
            'Integrated Stripe payment handling $5M+ monthly transactions',
          ],
        },
      ],
      education: [
        {
          degree: 'Bachelor of Science in Computer Science',
          institution: 'University of Texas at Austin',
          graduation_year: 2017,
          gpa: '3.8',
        },
      ],
      certifications: [
        'AWS Certified Solutions Architect – Associate',
        'Meta Certified Senior Front-End Developer',
      ],
    },
  },
  {
    id: 'data-scientist',
    title: 'Lead AI & Data Scientist Resume',
    category: 'AI / Data Science',
    rawResumeText: `
Dr. Priya Sharma
New York, NY | priya.sharma@aiml-research.org | (555) 872-9102

PROFESSIONAL OVERVIEW
Lead Data Scientist with Ph.D. in Artificial Intelligence and 6 years of experience designing LLM fine-tuning pipelines, computer vision models, and predictive analytics engines. Specialist in PyTorch, TensorFlow, MLflow, and GCP BigQuery ML.

CAREER HISTORY
Lead Data Scientist | DataVertex AI | New York, NY
January 2022 – Present
- Trained custom domain LLMs using LoRA fine-tuning, improving customer support intent recognition accuracy by 32%.
- Built end-to-end MLOps pipeline on Google Cloud Vertex AI serving 500k daily inference requests with latency <120ms.

Senior Machine Learning Engineer | Quantum Analytics | Boston, MA
August 2018 – December 2021
- Deployed fraud detection XGBoost model reducing financial loss by $1.8M annually.

SKILLS
ML & AI: PyTorch, TensorFlow, Hugging Face, LLMs, RAG, Scikit-Learn, Pandas, NumPy
Cloud & MLOps: Google Cloud Vertex AI, AWS SageMaker, MLflow, Docker, Kubernetes, SQL, BigQuery

EDUCATION
Ph.D. in Computer Science (Artificial Intelligence) | MIT | 2018
M.S. in Applied Mathematics | Columbia University | 2014
    `.trim(),
    expectedJson: {
      candidate_name: 'Dr. Priya Sharma',
      contact_info: {
        email: 'priya.sharma@aiml-research.org',
        phone: '(555) 872-9102',
        location: 'New York, NY',
      },
      summary: 'Lead Data Scientist with Ph.D. in Artificial Intelligence and 6 years of experience designing LLM fine-tuning pipelines and MLOps engines.',
      years_of_experience: 6,
      skills: [
        'PyTorch',
        'TensorFlow',
        'Hugging Face',
        'LLMs',
        'RAG',
        'Scikit-Learn',
        'Pandas',
        'NumPy',
        'Google Cloud Vertex AI',
        'AWS SageMaker',
        'MLflow',
        'Docker',
        'SQL',
        'BigQuery',
      ],
      work_experience: [
        {
          title: 'Lead Data Scientist',
          company: 'DataVertex AI',
          location: 'New York, NY',
          start_date: 'January 2022',
          end_date: 'Present',
          key_achievements: [
            'Trained custom domain LLMs using LoRA fine-tuning',
            'Built end-to-end MLOps pipeline on Vertex AI serving 500k daily requests',
          ],
        },
        {
          title: 'Senior Machine Learning Engineer',
          company: 'Quantum Analytics',
          location: 'Boston, MA',
          start_date: 'August 2018',
          end_date: 'December 2021',
          key_achievements: [
            'Deployed fraud detection XGBoost model reducing financial loss by $1.8M',
          ],
        },
      ],
      education: [
        {
          degree: 'Ph.D. in Computer Science (Artificial Intelligence)',
          institution: 'MIT',
          graduation_year: 2018,
        },
        {
          degree: 'M.S. in Applied Mathematics',
          institution: 'Columbia University',
          graduation_year: 2014,
        },
      ],
      certifications: [],
    },
  },
];
