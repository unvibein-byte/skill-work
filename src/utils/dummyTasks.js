/**
 * Dummy Tasks Database - 100+ randomly selectable tasks
 * Each task includes PDF and Resume variants
 */

// PDF Data Templates for various invoices/documents
const pdfDataTemplates = [
  {
    invoiceRef: 'INV-2026-001',
    customerName: 'Rajesh Kumar',
    amountDue: '15,750',
    billingStatus: 'Verified',
  },
  {
    invoiceRef: 'INV-2026-002',
    customerName: 'Priya Singh',
    amountDue: '28,500',
    billingStatus: 'Pending',
  },
  {
    invoiceRef: 'INV-2026-003',
    customerName: 'Amit Patel',
    amountDue: '42,300',
    billingStatus: 'Verified',
  },
  {
    invoiceRef: 'INV-2026-004',
    customerName: 'Deepak Sharma',
    amountDue: '33,600',
    billingStatus: 'Verified',
  },
  {
    invoiceRef: 'INV-2026-005',
    customerName: 'Neha Gupta',
    amountDue: '19,200',
    billingStatus: 'Verified',
  },
  {
    invoiceRef: 'INV-2026-006',
    customerName: 'Vikram Reddy',
    amountDue: '51,800',
    billingStatus: 'Verified',
  },
  {
    invoiceRef: 'INV-2026-007',
    customerName: 'Anjali Verma',
    amountDue: '24,500',
    billingStatus: 'Verified',
  },
  {
    invoiceRef: 'INV-2026-008',
    customerName: 'Suresh Joshi',
    amountDue: '37,900',
    billingStatus: 'Pending',
  },
  {
    invoiceRef: 'INV-2026-009',
    customerName: 'Meera Iyer',
    amountDue: '16,400',
    billingStatus: 'Verified',
  },
  {
    invoiceRef: 'INV-2026-010',
    customerName: 'Rohan Desai',
    amountDue: '45,200',
    billingStatus: 'Verified',
  },
  {
    invoiceRef: 'INV-2026-011',
    customerName: 'Kavya Nair',
    amountDue: '22,100',
    billingStatus: 'Verified',
  },
  {
    invoiceRef: 'INV-2026-012',
    customerName: 'Arjun Malik',
    amountDue: '29,700',
    billingStatus: 'Verified',
  },
  {
    invoiceRef: 'INV-2026-013',
    customerName: 'Divya Chakraborty',
    amountDue: '18,900',
    billingStatus: 'Verified',
  },
  {
    invoiceRef: 'INV-2026-014',
    customerName: 'Aditya Singh',
    amountDue: '52,300',
    billingStatus: 'Pending',
  },
  {
    invoiceRef: 'INV-2026-015',
    customerName: 'Shruti Bansal',
    amountDue: '31,600',
    billingStatus: 'Verified',
  },
  {
    invoiceRef: 'INV-2026-016',
    customerName: 'Nikhil Soni',
    amountDue: '25,800',
    billingStatus: 'Verified',
  },
  {
    invoiceRef: 'INV-2026-017',
    customerName: 'Pooja Saxena',
    amountDue: '44,100',
    billingStatus: 'Verified',
  },
  {
    invoiceRef: 'INV-2026-018',
    customerName: 'Varun Tripathi',
    amountDue: '17,500',
    billingStatus: 'Verified',
  },
  {
    invoiceRef: 'INV-2026-019',
    customerName: 'Isha Kapoor',
    amountDue: '39,200',
    billingStatus: 'Verified',
  },
  {
    invoiceRef: 'INV-2026-020',
    customerName: 'Sanjay Kumar',
    amountDue: '27,400',
    billingStatus: 'Verified',
  },
];

// Resume Data Templates
const resumeDataTemplates = [
  {
    fullName: 'Rahul Sharma',
    email: 'rahul.sharma@email.com',
    education: 'B.Tech in Information Technology',
    skills: 'Python, Django, PostgreSQL, AWS',
    experience: '3 Years as Backend Developer',
  },
  {
    fullName: 'Sneha Desai',
    email: 'sneha.desai@email.com',
    education: 'BCA in Computer Applications',
    skills: 'React, JavaScript, Node.js, MongoDB',
    experience: '2 Years as Frontend Developer',
  },
  {
    fullName: 'Arjun Verma',
    email: 'arjun.verma@email.com',
    education: 'B.Tech in Computer Science',
    skills: 'Java, Spring Boot, MySQL, Docker',
    experience: '4 Years as Full Stack Developer',
  },
  {
    fullName: 'Priya Gupta',
    email: 'priya.gupta@email.com',
    education: 'BIT in Information Technology',
    skills: 'UI/UX Design, Figma, Adobe XD, Prototyping',
    experience: '3 Years as UI/UX Designer',
  },
  {
    fullName: 'Vikram Singh',
    email: 'vikram.singh@email.com',
    education: 'B.Tech in Electronics Engineering',
    skills: 'IoT, Arduino, Embedded Systems, C++',
    experience: '2 Years as Embedded Systems Engineer',
  },
  {
    fullName: 'Anjali Iyer',
    email: 'anjali.iyer@email.com',
    education: 'Master in Business Administration',
    skills: 'Project Management, Agile, Scrum, Leadership',
    experience: '5 Years as Project Manager',
  },
  {
    fullName: 'Rohan Patel',
    email: 'rohan.patel@email.com',
    education: 'B.Tech in Computer Engineering',
    skills: 'Machine Learning, Python, TensorFlow, Data Analytics',
    experience: '3 Years as ML Engineer',
  },
  {
    fullName: 'Meera Nair',
    email: 'meera.nair@email.com',
    education: 'BCA in Computer Applications',
    skills: 'SQL, Oracle, Database Administration, Linux',
    experience: '4 Years as Database Administrator',
  },
  {
    fullName: 'Aditya Kumar',
    email: 'aditya.kumar@email.com',
    education: 'B.Tech in Information Technology',
    skills: 'Cloud Architecture, Azure, AWS, DevOps',
    experience: '3 Years as Cloud Architect',
  },
  {
    fullName: 'Divya Chakraborty',
    email: 'divya.chakraborty@email.com',
    education: 'Bachelor in Computer Science',
    skills: 'Testing, QA, Selenium, Manual Testing',
    experience: '2 Years as QA Engineer',
  },
  {
    fullName: 'Nikhil Reddy',
    email: 'nikhil.reddy@email.com',
    education: 'B.Tech in Computer Science',
    skills: 'Web Development, HTML, CSS, JavaScript, PHP',
    experience: '2 Years as Web Developer',
  },
  {
    fullName: 'Shreya Joshi',
    email: 'shreya.joshi@email.com',
    education: 'BIT in Information Technology',
    skills: 'Cybersecurity, Network Security, Penetration Testing',
    experience: '3 Years as Security Analyst',
  },
  {
    fullName: 'Abhishek Sharma',
    email: 'abhishek.sharma@email.com',
    education: 'B.Tech in Computer Science',
    skills: 'DevOps, Kubernetes, Docker, CI/CD',
    experience: '3 Years as DevOps Engineer',
  },
  {
    fullName: 'Pooja Singh',
    email: 'pooja.singh@email.com',
    education: 'Master in Data Science',
    skills: 'Data Science, Python, R, Tableau',
    experience: '2 Years as Data Scientist',
  },
  {
    fullName: 'Varun Tripathi',
    email: 'varun.tripathi@email.com',
    education: 'B.Tech in Information Technology',
    skills: 'Mobile Development, Swift, Kotlin, React Native',
    experience: '3 Years as Mobile Developer',
  },
  {
    fullName: 'Isha Kapoor',
    email: 'isha.kapoor@email.com',
    education: 'BCA in Computer Applications',
    skills: 'Content Writing, SEO, Digital Marketing, Copywriting',
    experience: '2 Years as Content Strategist',
  },
  {
    fullName: 'Sanjay Verma',
    email: 'sanjay.verma@email.com',
    education: 'Bachelor in Software Engineering',
    skills: 'GraphQL, REST APIs, Microservices, Architecture',
    experience: '5 Years as Senior Developer',
  },
  {
    fullName: 'Kavya Saxena',
    email: 'kavya.saxena@email.com',
    education: 'B.Tech in Computer Science',
    skills: 'Game Development, Unity, C#, Game Design',
    experience: '2 Years as Game Developer',
  },
  {
    fullName: 'Anuj Malik',
    email: 'anuj.malik@email.com',
    education: 'Bachelor in Information Technology',
    skills: 'Technical Writing, Documentation, API Docs',
    experience: '3 Years as Technical Writer',
  },
  {
    fullName: 'Shruti Bansal',
    email: 'shruti.bansal@email.com',
    education: 'B.Tech in Computer Engineering',
    skills: 'Systems Administration, Linux, Windows Server',
    experience: '4 Years as Systems Administrator',
  },
];

export const MIN_TASK_REWARD = 101;
export const MIN_MEDIUM_REWARD = 251;
export const MIN_HARD_REWARD = 501;

export function resolveTaskReward(reward, difficultyLabel = 'Easy') {
  const amount = Number(reward) || MIN_TASK_REWARD;
  if (difficultyLabel === 'Hard') return Math.max(amount, MIN_HARD_REWARD);
  if (difficultyLabel === 'Medium') return Math.max(amount, MIN_MEDIUM_REWARD);
  return Math.max(amount, MIN_TASK_REWARD);
}

// Easy > ₹100 · Medium > ₹250 · Hard > ₹500
const difficulties = [
  { level: 1, label: 'Easy', reward: 105 },
  { level: 1, label: 'Easy', reward: 150 },
  { level: 1, label: 'Easy', reward: 200 },
  { level: 2, label: 'Medium', reward: 260 },
  { level: 2, label: 'Medium', reward: 300 },
  { level: 3, label: 'Hard', reward: 520 },
  { level: 3, label: 'Hard', reward: 600 },
];

// Time estimates
const timeEstimates = ['~5 mins', '~10 mins', '~15 mins', '~20 mins', '~25 mins', '~30 mins'];

/**
 * Generate 100+ dummy tasks
 */
export const generateDummyTasks = () => {
  const tasks = [];
  let taskId = 1;

  // Generate 50 PDF tasks
  for (let i = 0; i < 50; i++) {
    const pdfIndex = i % pdfDataTemplates.length;
    const diffIndex = i % difficulties.length;
    const timeIndex = i % timeEstimates.length;

    tasks.push({
      id: taskId++,
      type: 'pdf',
      title: `PDF Editing Task #${taskId}`,
      description: 'Extract and correct invoice data from PDF documents',
      reward: difficulties[diffIndex].reward,
      difficulty: difficulties[diffIndex].level,
      difficultyLabel: difficulties[diffIndex].label,
      timeEstimate: timeEstimates[timeIndex],
      sourceData: {
        invoiceRef: pdfDataTemplates[pdfIndex].invoiceRef,
        customerName: pdfDataTemplates[pdfIndex].customerName,
        amountDue: pdfDataTemplates[pdfIndex].amountDue,
        billingStatus: pdfDataTemplates[pdfIndex].billingStatus,
      },
    });
  }

  // Generate 50 Resume tasks
  for (let i = 0; i < 50; i++) {
    const resumeIndex = i % resumeDataTemplates.length;
    const diffIndex = i % difficulties.length;
    const timeIndex = i % timeEstimates.length;

    tasks.push({
      id: taskId++,
      type: 'resume',
      title: `Resume Filling Task #${taskId}`,
      description: 'Fill candidate resume template with formatted data',
      editInstructions: 'Check grammar, correct formatting, and ensure skills and experience are properly summarized. Preserve technical keywords and shorten long sentences.',
      reward: difficulties[diffIndex].reward,
      difficulty: difficulties[diffIndex].level,
      difficultyLabel: difficulties[diffIndex].label,
      timeEstimate: timeEstimates[timeIndex],
      sourceData: {
        fullName: resumeDataTemplates[resumeIndex].fullName,
        email: resumeDataTemplates[resumeIndex].email,
        education: resumeDataTemplates[resumeIndex].education,
        skills: resumeDataTemplates[resumeIndex].skills,
        experience: resumeDataTemplates[resumeIndex].experience,
        // small generated resume preview text to edit
        resumeText: `${resumeDataTemplates[resumeIndex].fullName}\n${resumeDataTemplates[resumeIndex].education}\n${resumeDataTemplates[resumeIndex].experience}\nSkills: ${resumeDataTemplates[resumeIndex].skills}`,
      },
    });
  }

  return tasks;
};

/**
 * Get a random task from all available tasks
 */
export const getRandomTask = () => {
  const allTasks = generateDummyTasks();
  const randomIndex = Math.floor(Math.random() * allTasks.length);
  return allTasks[randomIndex];
};

/**
 * Get a specific task by ID
 */
export const getTaskById = (taskId) => {
  const allTasks = generateDummyTasks();
  return allTasks.find(task => task.id === taskId);
};

/**
 * Get all tasks of a specific type
 */
export const getTasksByType = (type) => {
  const allTasks = generateDummyTasks();
  return allTasks.filter(task => task.type === type);
};

/**
 * Get random task of specific type
 */
export const getRandomTaskByType = (type) => {
  const typedTasks = getTasksByType(type);
  if (typedTasks.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * typedTasks.length);
  return typedTasks[randomIndex];
};

export default {
  generateDummyTasks,
  getRandomTask,
  getTaskById,
  getTasksByType,
  getRandomTaskByType,
};
