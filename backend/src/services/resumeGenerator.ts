import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import fs from 'fs';
import path from 'path';
import { s3Service } from './s3';
import { isUsingS3 } from '../middleware/upload';

export const resumeGenerator = {
  /**
   * Generate DOCX file from resume text
   */
  async generateDOCX(resumeText: string, outputPath: string): Promise<Buffer> {
    // Parse resume text into structured format
    const sections = this.parseResumeText(resumeText);
    
    const children: (Paragraph | Paragraph[])[] = [];

    // Name as title
    if (sections.name) {
      children.push(
        new Paragraph({
          text: sections.name,
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
        })
      );
    }

    // Contact info
    if (sections.contact.length > 0) {
      children.push(
        new Paragraph({
          text: sections.contact.join(' | '),
          alignment: AlignmentType.CENTER,
        })
      );
      children.push(new Paragraph({ text: '' })); // Spacing
    }

    // Summary
    if (sections.summary) {
      children.push(
        new Paragraph({
          text: 'PROFESSIONAL SUMMARY',
          heading: HeadingLevel.HEADING_1,
        })
      );
      children.push(
        new Paragraph({
          children: [new TextRun(sections.summary)],
        })
      );
      children.push(new Paragraph({ text: '' })); // Spacing
    }

    // Experience
    if (sections.experience.length > 0) {
      children.push(
        new Paragraph({
          text: 'EXPERIENCE',
          heading: HeadingLevel.HEADING_1,
        })
      );
      
      sections.experience.forEach(exp => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: exp.title, bold: true }),
              new TextRun({ text: ' | ', italics: true }),
              new TextRun({ text: exp.company, italics: true }),
              new TextRun({ text: ' | ', italics: true }),
              new TextRun({ text: exp.duration, italics: true }),
            ],
          })
        );
        
        exp.description.forEach(desc => {
          children.push(
            new Paragraph({
              children: [new TextRun(`• ${desc}`)],
              indent: { left: 360 }, // 0.25 inch
            })
          );
        });
        
        children.push(new Paragraph({ text: '' })); // Spacing between jobs
      });
    }

    // Skills
    if (sections.skills.length > 0) {
      children.push(
        new Paragraph({
          text: 'SKILLS',
          heading: HeadingLevel.HEADING_1,
        })
      );
      children.push(
        new Paragraph({
          children: [new TextRun(sections.skills.join(' • '))],
        })
      );
      children.push(new Paragraph({ text: '' })); // Spacing
    }

    // Education
    if (sections.education.length > 0) {
      children.push(
        new Paragraph({
          text: 'EDUCATION',
          heading: HeadingLevel.HEADING_1,
        })
      );
      sections.education.forEach(edu => {
        children.push(
          new Paragraph({
            children: [new TextRun(edu)],
          })
        );
      });
    }

    const doc = new Document({
      sections: [{
        children: children.flat(),
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    
    if (isUsingS3) {
      // Upload to S3
      await s3Service.uploadFile(outputPath, buffer, 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    } else {
      // Ensure directory exists
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // Save locally
      fs.writeFileSync(outputPath, buffer);
    }
    
    return buffer;
  },

  /**
   * Parse resume text into structured sections
   */
  parseResumeText(text: string) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    const result = {
      name: '',
      contact: [] as string[],
      summary: '',
      experience: [] as Array<{
        title: string;
        company: string;
        duration: string;
        description: string[];
      }>,
      skills: [] as string[],
      education: [] as string[],
    };

    let currentSection = '';
    let currentExperience: typeof result.experience[0] | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const upperLine = line.toUpperCase();

      // Detect name (usually first line or after empty lines)
      if (i === 0 && line.length < 50 && !line.includes('@') && !line.includes('phone')) {
        result.name = line;
        continue;
      }

      // Detect contact info
      if (line.includes('@') || line.includes('phone') || line.match(/\d{3}[-.]?\d{3}[-.]?\d{4}/)) {
        result.contact.push(line);
        continue;
      }

      // Detect sections
      if (upperLine.includes('SUMMARY') || upperLine.includes('OBJECTIVE')) {
        currentSection = 'summary';
        continue;
      }
      if (upperLine.includes('EXPERIENCE') || upperLine.includes('WORK HISTORY')) {
        currentSection = 'experience';
        continue;
      }
      if (upperLine.includes('SKILLS') || upperLine.includes('TECHNICAL SKILLS')) {
        currentSection = 'skills';
        continue;
      }
      if (upperLine.includes('EDUCATION')) {
        currentSection = 'education';
        continue;
      }

      // Process content based on current section
      if (currentSection === 'summary') {
        if (result.summary) result.summary += ' ';
        result.summary += line;
      } else if (currentSection === 'experience') {
        // Try to detect job entry (contains company or date pattern)
        if (line.match(/\d{4}|\d{2}\/\d{4}|Present|Current/i) || 
            (line.length < 100 && !line.startsWith('•') && !line.startsWith('-'))) {
          // Might be a new job entry
          if (currentExperience && currentExperience.description.length > 0) {
            result.experience.push(currentExperience);
          }
          
          // Try to parse job title, company, duration
          const parts = line.split('|').map(p => p.trim());
          currentExperience = {
            title: parts[0] || line,
            company: parts[1] || '',
            duration: parts[2] || '',
            description: [],
          };
        } else if (currentExperience && (line.startsWith('•') || line.startsWith('-'))) {
          // Bullet point
          currentExperience.description.push(line.replace(/^[•\-]\s*/, ''));
        } else if (currentExperience) {
          // Additional description line
          currentExperience.description.push(line);
        }
      } else if (currentSection === 'skills') {
        // Skills can be comma-separated or bullet points
        if (line.includes(',')) {
          result.skills.push(...line.split(',').map(s => s.trim()).filter(s => s));
        } else if (line.startsWith('•') || line.startsWith('-')) {
          result.skills.push(line.replace(/^[•\-]\s*/, ''));
        } else {
          result.skills.push(line);
        }
      } else if (currentSection === 'education') {
        result.education.push(line);
      }
    }

    // Add last experience if exists
    if (currentExperience && currentExperience.description.length > 0) {
      result.experience.push(currentExperience);
    }

    return result;
  },
};

