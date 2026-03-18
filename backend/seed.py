from sqlalchemy.orm import Session
from database import SessionLocal
from models import User, NEPCourse, FacultySchedule
from utils import hash_password


PERIOD_TIMES = {
    "P1": ("09:00", "09:50"),
    "P2": ("10:00", "10:50"),
    "P3": ("11:00", "11:50"),
    "P4": ("12:00", "12:50"),
    "P5": ("13:30", "14:20"),
    "P6": ("14:30", "15:20"),
}

ALL_PERIODS = ["P1", "P2", "P3", "P4", "P5", "P6"]


def seed_data():
    db: Session = SessionLocal()

    if db.query(User).filter(User.role == "admin").first():
        db.close()
        return

    # ── Admin ──────────────────────────────────────────────────────────────────
    admin = User(
        name="Admin", email="admin@smartcampus.com",
        password=hash_password("admin123"), role="admin",
        department="CSE(AI&DS)", is_approved=True
    )
    db.add(admin)

    # ── Faculty ────────────────────────────────────────────────────────────────
    faculty_ids = []
    for i in range(1, 7):
        f = User(
            name=f"Faculty {i}",
            email=f"faculty{i}@smartcampus.com",
            password=hash_password(f"fac{i}123"),
            role="faculty", department="CSE(AI&DS)", is_approved=True
        )
        db.add(f)
        db.flush()
        faculty_ids.append(f.id)

    db.commit()

    fid = faculty_ids[0]

    monday_classes = [
        ("P1", "SUBJ001", "Data Structures",   "AI-1A", "10", "theory"),
        ("P2", "SUBJ002", "Design & Analysis",  "AI-1A", "11", "theory"),
        ("P5", "SUBJ003", "DS Lab",             "AI-1A", "14", "lab"),
        ("P6", "SUBJ004", "Algorithm Lab",      "AI-1A", "15", "lab"),
    ]
    for period, code, subject, section, room, ctype in monday_classes:
        start, end = PERIOD_TIMES[period]
        db.add(FacultySchedule(
            faculty_id=fid, day_of_week=0, period=period,
            subject=subject, subject_code=code, section=section,
            class_type=ctype, room_no=room, start_time=start, end_time=end
        ))

    tuesday_classes = [
        ("P1", "SUBJ001", "Data Structures",  "AI-1A", "10", "theory"),
        ("P3", "SUBJ005", "Machine Learning", "AI-1B", "12", "theory"),
        ("P4", "SUBJ005", "Machine Learning", "AI-1B", "12", "theory"),
        ("P6", "SUBJ003", "DS Lab",           "AI-1A", "14", "lab"),
    ]
    for period, code, subject, section, room, ctype in tuesday_classes:
        start, end = PERIOD_TIMES[period]
        db.add(FacultySchedule(
            faculty_id=fid, day_of_week=1, period=period,
            subject=subject, subject_code=code, section=section,
            class_type=ctype, room_no=room, start_time=start, end_time=end
        ))

    for idx, fac_id in enumerate(faculty_ids[1:], start=1):
        start, end = PERIOD_TIMES["P1"]
        db.add(FacultySchedule(
            faculty_id=fac_id, day_of_week=idx, period="P1",
            subject="Data Structures", subject_code=f"SUBJ00{idx+1}",
            section="AI-1A", class_type="theory",
            room_no=f"AI-{101 + idx}", start_time=start, end_time=end
        ))

    # ── NEP Courses — replace old incomplete rows, seed full 44-course list ──────
    # If any course is missing platform/description, wipe and re-seed all courses
    first_course = db.query(NEPCourse).first()
    needs_reseed = first_course is None or not getattr(first_course, "platform", None)
    if needs_reseed:
        db.query(NEPCourse).delete()
        db.commit()
    if needs_reseed:
        courses = [

            # ── AI & Machine Learning ─────────────────────────────────────────
            NEPCourse(title="Machine Learning with Python",
                category="AI",
                skill_tag="machine learning python ai artificial intelligence scikit-learn statistics",
                duration="8 weeks", platform="NPTEL / Coursera",
                description="Supervised & unsupervised learning, model evaluation using scikit-learn."),

            NEPCourse(title="Deep Learning & Neural Networks",
                category="AI",
                skill_tag="deep learning neural networks tensorflow keras ai artificial intelligence python",
                duration="10 weeks", platform="Coursera (deeplearning.ai)",
                description="CNNs, RNNs, LSTMs, transfer learning with TensorFlow and Keras."),

            NEPCourse(title="Natural Language Processing",
                category="AI",
                skill_tag="nlp natural language processing transformers bert ai text python",
                duration="8 weeks", platform="NPTEL / Hugging Face",
                description="Text classification, sentiment analysis, transformers, BERT fine-tuning."),

            NEPCourse(title="Computer Vision with OpenCV",
                category="AI",
                skill_tag="computer vision opencv image processing ai deep learning python",
                duration="6 weeks", platform="Udemy / NPTEL",
                description="Image processing, object detection, face recognition, YOLO."),

            NEPCourse(title="Reinforcement Learning",
                category="AI",
                skill_tag="reinforcement learning ai q-learning openai gym python deep learning",
                duration="8 weeks", platform="Coursera",
                description="Markov decision processes, Q-learning, policy gradients, OpenAI Gym."),

            NEPCourse(title="Generative AI & Prompt Engineering",
                category="AI",
                skill_tag="generative ai llm chatgpt prompt engineering gpt langchain artificial intelligence",
                duration="4 weeks", platform="Google / OpenAI",
                description="LLMs, prompt design, RAG, LangChain application development."),

            # ── Data Science & Analytics ──────────────────────────────────────
            NEPCourse(title="Data Science with Python",
                category="Data",
                skill_tag="data science python pandas numpy matplotlib analysis statistics",
                duration="6 weeks", platform="NPTEL / Kaggle",
                description="EDA, data wrangling, visualisation, statistics with pandas and numpy."),

            NEPCourse(title="Data Visualisation & Storytelling",
                category="Data",
                skill_tag="data visualisation tableau power bi analytics storytelling dashboard",
                duration="4 weeks", platform="Tableau / Microsoft Learn",
                description="Dashboards, charts, Tableau, Power BI, data-driven storytelling."),

            NEPCourse(title="Big Data Analytics with Hadoop & Spark",
                category="Data",
                skill_tag="big data hadoop spark analytics distributed computing python",
                duration="8 weeks", platform="NPTEL / Cloudera",
                description="HDFS, MapReduce, Apache Spark, Hive for large-scale data processing."),

            NEPCourse(title="Statistics for Data Science",
                category="Data",
                skill_tag="statistics probability data science regression hypothesis testing python",
                duration="6 weeks", platform="NPTEL",
                description="Probability, distributions, hypothesis testing, regression analysis."),

            NEPCourse(title="Business Intelligence & Analytics",
                category="Data",
                skill_tag="business intelligence analytics power bi sql reporting dashboard",
                duration="5 weeks", platform="Microsoft Learn",
                description="KPIs, BI tools, SQL reporting, Power BI dashboards."),

            # ── Web Development ───────────────────────────────────────────────
            NEPCourse(title="Full Stack Web Development",
                category="Web",
                skill_tag="full stack web development react nodejs javascript html css mongodb",
                duration="12 weeks", platform="freeCodeCamp / NPTEL",
                description="HTML, CSS, JavaScript, React frontend + Node.js/Express backend."),

            NEPCourse(title="React & Modern Frontend Development",
                category="Web",
                skill_tag="react javascript frontend web development typescript hooks state",
                duration="6 weeks", platform="Scrimba / Udemy",
                description="React hooks, state management, TypeScript, component architecture."),

            NEPCourse(title="Backend Development with Node.js",
                category="Web",
                skill_tag="nodejs backend javascript api rest express mongodb web",
                duration="6 weeks", platform="Udemy / freeCodeCamp",
                description="REST APIs, Express.js, authentication, MongoDB integration."),

            NEPCourse(title="Django & Python Web Framework",
                category="Web",
                skill_tag="django python web development backend api rest framework",
                duration="6 weeks", platform="NPTEL / Udemy",
                description="Django ORM, REST Framework, authentication, deployment."),

            NEPCourse(title="Progressive Web Apps & UI/UX",
                category="Web",
                skill_tag="pwa ui ux design web frontend user interface mobile responsive",
                duration="5 weeks", platform="Google Developers",
                description="PWA concepts, service workers, responsive design, UX principles."),

            # ── Cloud Computing ───────────────────────────────────────────────
            NEPCourse(title="AWS Cloud Foundations",
                category="Cloud",
                skill_tag="cloud aws amazon web services devops infrastructure deployment",
                duration="6 weeks", platform="AWS Training",
                description="EC2, S3, Lambda, IAM, VPC — core AWS services and cloud concepts."),

            NEPCourse(title="Google Cloud Platform Essentials",
                category="Cloud",
                skill_tag="cloud gcp google cloud platform devops kubernetes deployment",
                duration="5 weeks", platform="Google Cloud Skills Boost",
                description="GCE, GCS, BigQuery, Cloud Run, Kubernetes on GKE."),

            NEPCourse(title="Microsoft Azure Fundamentals (AZ-900)",
                category="Cloud",
                skill_tag="cloud azure microsoft devops infrastructure certification",
                duration="4 weeks", platform="Microsoft Learn",
                description="Azure services, pricing, SLAs — AZ-900 certification prep."),

            NEPCourse(title="DevOps & CI/CD Pipelines",
                category="Cloud",
                skill_tag="devops cicd docker kubernetes jenkins git automation cloud deployment",
                duration="8 weeks", platform="Linux Foundation / Udemy",
                description="Docker, Kubernetes, Jenkins, GitHub Actions, infrastructure as code."),

            NEPCourse(title="Serverless & Microservices Architecture",
                category="Cloud",
                skill_tag="serverless microservices cloud aws lambda api gateway devops",
                duration="5 weeks", platform="AWS / Coursera",
                description="Serverless architecture, Lambda, API Gateway, microservices patterns."),

            # ── Cybersecurity ─────────────────────────────────────────────────
            NEPCourse(title="Ethical Hacking & Penetration Testing",
                category="Security",
                skill_tag="ethical hacking cybersecurity penetration testing security kali linux network",
                duration="10 weeks", platform="EC-Council / NPTEL",
                description="Network scanning, exploitation, web app hacking, Kali Linux tools."),

            NEPCourse(title="Cybersecurity Fundamentals",
                category="Security",
                skill_tag="cybersecurity network security firewalls encryption protocols defence",
                duration="6 weeks", platform="NPTEL / Cisco NetAcad",
                description="CIA triad, cryptography, firewalls, IDS/IPS, security policies."),

            NEPCourse(title="Web Application Security & OWASP",
                category="Security",
                skill_tag="web security owasp sql injection xss cybersecurity hacking testing",
                duration="5 weeks", platform="PortSwigger / OWASP",
                description="OWASP Top 10, Burp Suite, SQL injection, XSS, CSRF defences."),

            NEPCourse(title="Digital Forensics & Incident Response",
                category="Security",
                skill_tag="digital forensics cybersecurity incident response malware analysis security",
                duration="6 weeks", platform="SANS / Cybrary",
                description="Evidence acquisition, malware analysis, DFIR methodology."),

            # ── Mobile Development ────────────────────────────────────────────
            NEPCourse(title="Android App Development with Kotlin",
                category="Mobile",
                skill_tag="android kotlin mobile app development jetpack compose ui",
                duration="8 weeks", platform="Google Developers / Udacity",
                description="Kotlin basics, Jetpack Compose, MVVM, Firebase integration."),

            NEPCourse(title="Flutter & Cross-Platform Development",
                category="Mobile",
                skill_tag="flutter dart mobile app cross platform android ios development",
                duration="8 weeks", platform="Flutter.dev / Udemy",
                description="Dart, Flutter widgets, state management, REST API integration."),

            NEPCourse(title="React Native Mobile Development",
                category="Mobile",
                skill_tag="react native mobile javascript app development android ios",
                duration="6 weeks", platform="Expo / Udemy",
                description="React Native components, navigation, native APIs, deployment."),

            # ── IoT & Embedded Systems ────────────────────────────────────────
            NEPCourse(title="IoT with Arduino & Raspberry Pi",
                category="IoT",
                skill_tag="iot internet of things arduino raspberry pi embedded sensors python",
                duration="8 weeks", platform="NPTEL / Coursera",
                description="Sensors, actuators, MQTT, Arduino programming, IoT protocols."),

            NEPCourse(title="Industrial IoT & Edge Computing",
                category="IoT",
                skill_tag="iot industrial edge computing embedded systems automation ai",
                duration="6 weeks", platform="Coursera / edX",
                description="Edge AI, industrial protocols, OPC-UA, predictive maintenance."),

            # ── Database ──────────────────────────────────────────────────────
            NEPCourse(title="SQL & Relational Database Design",
                category="Database",
                skill_tag="sql database mysql postgresql relational schema design backend",
                duration="5 weeks", platform="NPTEL / Mode Analytics",
                description="SQL queries, joins, indexing, normalisation, stored procedures."),

            NEPCourse(title="MongoDB & NoSQL Databases",
                category="Database",
                skill_tag="mongodb nosql database json aggregation backend web",
                duration="4 weeks", platform="MongoDB University",
                description="Document model, CRUD, aggregation pipeline, Atlas cloud."),

            # ── Programming & Algorithms ──────────────────────────────────────
            NEPCourse(title="Data Structures & Algorithms in Python",
                category="Programming",
                skill_tag="data structures algorithms python dsa problem solving coding competitive",
                duration="10 weeks", platform="NPTEL / LeetCode",
                description="Arrays, trees, graphs, dynamic programming, competitive coding."),

            NEPCourse(title="Competitive Programming",
                category="Programming",
                skill_tag="competitive programming algorithms coding contests problem solving c++ dsa",
                duration="12 weeks", platform="Codeforces / ICPC",
                description="Graph algorithms, DP, segment trees, contest strategy."),

            NEPCourse(title="Python for Automation & Scripting",
                category="Programming",
                skill_tag="python automation scripting web scraping selenium pandas devops",
                duration="5 weeks", platform="Automate the Boring Stuff",
                description="File handling, web scraping, regex, task automation with Python."),

            NEPCourse(title="Java & Object-Oriented Programming",
                category="Programming",
                skill_tag="java object oriented programming oop backend spring development",
                duration="8 weeks", platform="NPTEL / Udemy",
                description="OOP principles, collections, exceptions, Spring Boot basics."),

            # ── Design ────────────────────────────────────────────────────────
            NEPCourse(title="UI/UX Design with Figma",
                category="Design",
                skill_tag="ui ux design figma user interface prototype wireframe web mobile",
                duration="6 weeks", platform="Figma / Google UX Design",
                description="User research, wireframing, prototyping, design systems in Figma."),

            NEPCourse(title="Graphic Design & Visual Communication",
                category="Design",
                skill_tag="graphic design adobe photoshop illustrator visual communication",
                duration="5 weeks", platform="Adobe / Canva",
                description="Design principles, typography, colour theory, Adobe tools."),

            # ── Business & Entrepreneurship ───────────────────────────────────
            NEPCourse(title="Startup & Entrepreneurship Fundamentals",
                category="Business",
                skill_tag="startup entrepreneurship business management innovation lean product",
                duration="4 weeks", platform="NPTEL / edX",
                description="Lean startup, business model canvas, pitching, funding basics."),

            NEPCourse(title="Digital Marketing & SEO",
                category="Business",
                skill_tag="digital marketing seo social media content google ads analytics business",
                duration="5 weeks", platform="Google Digital Garage",
                description="SEO, SEM, social media marketing, Google Ads, analytics."),

            NEPCourse(title="Product Management",
                category="Business",
                skill_tag="product management agile scrum roadmap ux business strategy startup",
                duration="6 weeks", platform="Coursera / ProductHunt",
                description="Product lifecycle, roadmaps, agile, user stories, metrics."),

            # ── Soft Skills ───────────────────────────────────────────────────
            NEPCourse(title="Communication & Presentation Skills",
                category="Soft Skills",
                skill_tag="communication presentation public speaking soft skills leadership interpersonal",
                duration="4 weeks", platform="Coursera / Toastmasters",
                description="Public speaking, storytelling, slide design, professional communication."),

            NEPCourse(title="Leadership & Team Management",
                category="Soft Skills",
                skill_tag="leadership management teamwork agile soft skills collaboration",
                duration="4 weeks", platform="Coursera / LinkedIn Learning",
                description="Leadership styles, conflict resolution, team dynamics, agile teams."),

            # ── Blockchain & Emerging Tech ────────────────────────────────────
            NEPCourse(title="Blockchain & Web3 Development",
                category="Blockchain",
                skill_tag="blockchain web3 ethereum solidity smart contracts cryptocurrency decentralised",
                duration="8 weeks", platform="Coursera / Buildspace",
                description="Ethereum, Solidity, smart contracts, DApps, NFT development."),

            NEPCourse(title="Quantum Computing Basics",
                category="Emerging Tech",
                skill_tag="quantum computing qiskit physics emerging technology research ai",
                duration="5 weeks", platform="IBM Quantum / edX",
                description="Qubits, quantum gates, Qiskit, quantum algorithms introduction."),

            NEPCourse(title="AR/VR Development with Unity",
                category="Emerging Tech",
                skill_tag="ar vr augmented reality virtual reality unity3d metaverse game",
                duration="6 weeks", platform="Unity / Meta",
                description="Unity3D, AR Foundation, VR headset development, XR interactions."),

            NEPCourse(title="Game Development with Unity",
                category="Emerging Tech",
                skill_tag="game development unity3d c# ar vr graphics animation",
                duration="8 weeks", platform="Unity Learn",
                description="Unity engine, C# scripting, physics, 2D/3D game development."),
        ]
        db.add_all(courses)

    db.commit()
    db.close()