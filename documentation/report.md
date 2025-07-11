# User Authentication and Role-Based Access

Upon initial access, users are redirected to the **Login Page**, where they are provided with two secure options: logging in with existing credentials or creating a new account. The application employs **JWT (JSON Web Token) authentication**, ensuring secure session management and protection of user data.

## Login Functionality

Users are required to enter their registered **email address** and **password** to access the system. During the login process, each user must also specify their **role** (either *Student* or *Teacher*). The authentication mechanism ensures that users cannot access the system using a mismatched role. This role-based restriction enforces data and interface isolation for different user types.

## Signup Process

If an account does not already exist, users can proceed with the **Signup** process. They are required to provide the following information:

- Full Name  
- Email Address  
- Mobile Number  
- Password  
- Role Selection (*Student* or *Teacher*)

The role selected at signup is stored securely and used to determine interface access and available features throughout the system.

# Student User Interface

Once authenticated, users with the **Student** role are greeted with a dedicated and intuitive **chat-based interface** designed to support self-paced academic learning.

## Header Navigation

At the top-right corner of the interface, the student's **profile picture** is displayed, accompanied by a dropdown menu. This menu provides the following functionalities:

- **Edit Profile**:  
  Allows the student to modify their profile picture, name, mobile number, and password.

- **Logout**:  
  Enables the student to securely terminate their session.

## Sidebar Navigation

The **left-hand sidebar** includes an option to **"Add New Chat"**, which initiates a new conversational thread. Upon selection, the student is prompted to:

- Specify a **topic of conversation**
- Begin interacting with the chatbot using that context

Each chat is uniquely stored and displayed in the sidebar for future access.

## Subject Resource Access

Located at the top of the main content area is a **"Subjects"** button. When selected, the student can:

- Browse through a list of **available academic subjects**
- Access learning **resources** (uploaded by respective teachers) associated with each subject

These resources may include PDFs, reading materials, or other supporting documentation. Students can download these resources for independent study at their convenience.

## Chat Interaction Area

The primary interaction area includes a suite of tools that enable students to effectively engage with the system:

- **Text Input Box**:  
  Students can enter their academic queries in plain text. Strict content moderation is enforced to prohibit non-educational or inappropriate questions.

- **Subject Context Dropdown**:  
  This dropdown allows students to set the academic context for their queries. The system can tailor its responses based on:
  - The **teacher-uploaded PDFs**, or
  - A **general understanding** of the selected subject

- **Upload Feature (+ Icon)**:  
  Students can upload **PDFs** or **images**. These documents are processed on the backend and can influence the chatbot’s responses by providing additional context.

- **Microphone Input**:  
  A built-in microphone button enables **voice-to-text input**, making the interaction more accessible.

- **Send Button**:  
  Once a question is entered (via text or voice), the student can click this button to submit their query to the backend and receive a response.

- **Delete Chat**:  
  Chats that are no longer needed can be **deleted** using the available option in the interface.

## Suggestions Page

In instances where students are unable to find sufficient resources through the default subject materials, they can navigate to the **Suggestions Page**. This feature allows them to:

- Click **“Add Topic”**
- Select a **subject** from a dropdown menu
- Enter a **specific topic** they wish to explore further

Upon submission, the system retrieves:

- Relevant **articles**
- Curated **YouTube video resources**

These are displayed within the same interface for easy reference. Topics submitted through this feature are grouped and stored **subject-wise** for convenient future access.

This feature empowers students to extend their learning beyond the predefined material, fostering curiosity and independent research.
