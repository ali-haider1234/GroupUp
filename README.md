# GroupUp - FAST University FYP Partner & Group Finder

GroupUp is a web platform designed specifically for FAST National University (NUCES) students to find Final Year Project (FYP) group partners, form teams based on skills and departments, discover faculty supervisors, and manage group join requests.

---

## Key Features

### 1. Smart Student & Partner Discovery
- **Advanced Filtering**: Filter students by department (CS, SE, AI, EE), project domain, or technical skills.
- **Department Eligibility Rules**: Built-in cross-department grouping logic (e.g., CS, SE, and AI students can cross-group, while EE adheres to department-specific guidelines).
- **Student Profiles**: Display CGPA, skill tags, GitHub/LinkedIn links, bio, and project preferences.

### 2. FYP Group Management
- **Create & Customise Groups**: Define group names, project domain descriptions, target member counts, and open roles.
- **Join Requests Pipeline**: Send, accept, reject, or manage pending team join requests with real-time status updates.
- **My Group Dashboard**: View team members, role distribution, and group status (e.g., *Looking for members*, *Full*).

### 3. Faculty Supervisor Directory
- Explore university professors and supervisors filtered by research domains, designations, and departments to streamline project supervision outreach.

### 4. Authentication & Form Validation
- **FAST University Roll Number Validation**: Format enforcement (e.g., `22F-1234`) for authenticated student registration.
- **Supabase Integration**: Secure login, signup, password retrieval, and session persistence powered by Supabase Auth & Database.

---

## Tech Stack

| Component | Technology |
|---|---|
| **Frontend** | HTML5, CSS3 (Vanilla design system with CSS variables), JavaScript (ES6+) |
| **Backend & DB** | Supabase (Authentication & Database storage) |
| **Deployment** | Vercel (`vercel.json` included), `@vercel/analytics` |

---

## Repository Structure

```text
├── css/
│   └── style.css            # Central UI styling, variables, modal & component designs
├── js/
│   ├── app.js               # Core app state, Supabase client init & utility functions
│   ├── auth.js              # Signup, Login, Password reset logic & roll number formatting
│   ├── dashboard.js         # Student discovery, search, filter, and request actions
│   └── profile.js           # Profile management, edit modals, and user state sync
├── about.html               # About GroupUp platform & team overview
├── dashboard.html           # Main student discovery grid & partner finder page
├── forgot-password.html     # Password recovery page
├── index.html               # Landing page with hero banner & feature previews
├── login.html               # Student authentication page
├── mygroup.html             # FYP group management & team status page
├── profile.html             # User profile page
├── requests.html            # Incoming & outgoing group join requests
├── reset-password.html      # Reset password page
├── signup.html              # Student registration page
├── supervisors.html         # Faculty supervisor directory
├── view-profile.html        # Detailed public profile viewer
├── vercel.json              # Vercel deployment configuration
├── package.json             # NPM dependencies
└── LICENSE                  # Project license
```

---

## Getting Started

### Prerequisites
- Any modern web browser (Google Chrome, Firefox, Edge, Safari).
- Node.js & npm (optional, if running dependencies locally).

### Quick Start (Local Setup)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ali-haider1234/GroupUp.git
   cd GroupUp
   ```

2. **Run locally**:
   - Open `index.html` directly in your browser, or
   - Use VS Code Live Server extension to serve the root directory at `http://localhost:5500`.

---

## Deployment

This project is configured for deployment on **Vercel**:

1. Push your repository to GitHub.
2. Import the project into your Vercel Dashboard.
3. Vercel will automatically detect `vercel.json` and deploy your static site.

---

## Contributing

Contributions are welcome! If you'd like to report bugs or suggest improvements:

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

Distributed under the MIT License. See `LICENSE` for details.
