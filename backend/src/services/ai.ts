import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ResumeData {
  name: string;
  email: string;
  phone?: string;
  summary: string;
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string[];
  }>;
  skills: string[];
  education: Array<{
    degree: string;
    institution: string;
    year?: string;
  }>;
}

export const aiService = {
  /**
   * Extract resume data from text
   */
  async extractResumeData(resumeText: string): Promise<ResumeData> {
    const prompt = `Extract the following information from this resume text in JSON format:
{
  "name": "Full name",
  "email": "Email address",
  "phone": "Phone number if available",
  "summary": "Professional summary/objective",
  "experience": [{"title": "Job title", "company": "Company name", "duration": "Date range", "description": ["bullet point 1", "bullet point 2"]}],
  "skills": ["skill1", "skill2"],
  "education": [{"degree": "Degree name", "institution": "School name", "year": "Graduation year"}]
}

Resume text:
${resumeText.substring(0, 4000)}${resumeText.length > 4000 ? '...' : ''}

Return ONLY valid JSON, no additional text.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content);
  },

  /**
   * Generate tailored resume based on job description
   */
  async generateTailoredResume(
    resumeData: ResumeData,
    jobTitle: string,
    jobDescription: string
  ): Promise<string> {
    const prompt = `You are a professional resume writer. Create a tailored resume for the following job position.

Job Title: ${jobTitle}
Job Description: ${jobDescription}

Current Resume Data:
${JSON.stringify(resumeData, null, 2)}

Instructions:
1. Keep ALL the user's actual experience, skills, and education - DO NOT invent or change facts
2. Adjust the professional summary to highlight relevant experience for this position
3. Reorder and emphasize experience points that are most relevant to the job
4. Highlight relevant skills from the user's existing skills
5. Use action verbs and quantify achievements where possible
6. Keep the same format and structure
7. DO NOT add fake experience or skills - only use what's provided
8. Format the resume in a clean, professional structure with clear sections

Return the complete resume text in a professional format with sections:
- Name and Contact Information
- Professional Summary
- Experience (with company, title, duration, and bullet points)
- Skills
- Education

Use clear formatting with line breaks between sections.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    return response.choices[0].message.content || '';
  },
};

