# React FrontEnd ChiroNote Technical Documentation last updated 10.8.24

## Project Overview

ChiroNote is a React-based front-end application designed for creating and managing notes, with a focus on audio recording and transcription features. The application uses AWS Amplify for authentication and API management, ensuring secure handling of sensitive information.

## Project Structure

The project follows a standard React application structure:

```
chironote/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── Account/
│   │   ├── AuthUI/
│   │   ├── Feedback/
│   │   ├── Navbar/
│   │   └── Recording/
│   ├── graphql/
│   ├── App.jsx
│   ├── App.css
│   └── index.js
├── amplify/
├── package.json
└── README.md
```

## Main Components

### App.jsx

The main component that sets up the routing and overall structure of the application. It includes:

- User authentication handling
- Navigation setup
- Main layout with left panel (history) and clipboard container
- Integration of various components like Recording, Dictation, and EditPanel

### Recording/Recording.jsx

Handles the UI for the recording functionality, including:

- Start/stop recording buttons
- Language selection
- Note layout settings (Exam Layout, Bulleted Layout)
- Recording status display

### Recording/RecordingManager.jsx

Manages the recording process, including:

- Audio recording using the Web Audio API
- Uploading audio chunks to AWS Lambda
- Handling the transcription and summarization process
- Managing recording states (start, stop, pause, resume)

## Key Features

1. **Audio Recording**: Users can record audio notes with options for different languages.
2. **Real-time Transcription**: Audio is transcribed in real-time using AWS Lambda.
3. **Note Summarization**: Recorded notes are summarized and formatted based on user preferences.
4. **User Authentication**: Implemented using AWS Amplify for secure access.
5. **Clipboard Functionality**: Users can edit and manage their notes in a clipboard-like interface.
6. **History Management**: Previous notes and transcripts are stored and can be accessed from the left panel.

## Dependencies

Key dependencies include:

- React (^18.3.1)
- React Router (^6.26.1)
- AWS Amplify (^6.5.1)
- RecordRTC (^5.6.2)
- NoSleep.js (^0.12.0)

## API Integration

The application integrates with AWS Lambda functions for audio processing and transcription. Two main Lambda endpoints are used:

1. Audio chunk upload: `https://jl6rxdp4o3akmpye3ex3q2qlkq0zfyjf.lambda-url.us-east-2.on.aws`
2. Transcription and summarization: `https://xx3olxpcoay5sicmny45g7c5ay0ugvtm.lambda-url.us-east-2.on.aws`

## State Management

The application uses React's built-in state management (useState and useEffect hooks) for handling component-level state, providing efficient and responsive user interactions.

## Styling

The application uses CSS modules for styling, with separate CSS files for each component (e.g., Recording.css, Navbar.css). This approach ensures a modular and maintainable styling structure.

## Inputs and Protected Health Information (PHI)

### Conversation Input from RecordingManager

The audio recorded and processed by the RecordingManager component is considered Protected Health Information (PHI). This includes:

- Raw audio data captured during recording sessions
- Transcribed text generated from the audio

Handling:
- Audio data is sent in chunks to AWS Lambda for processing
- Transcribed text is returned via a secure stream
- All data transmission is encrypted using HTTPS
- Access to this data is restricted to authenticated users only

### Dictation Input

Text input through the dictation feature is also considered PHI. This includes:

- Any text entered or generated through the dictation process

Handling:
- Dictation data is processed locally and then sent to secure AWS services
- All transmission of dictation data is encrypted
- Access to dictation data is limited to the authenticated user who created it

### Edit Input

Any edits made to notes or transcripts are considered PHI. This includes:

- Modifications to existing notes or transcripts
- New text added during the editing process

Handling:
- Edits are processed and stored securely using AWS services
- All edit operations require user authentication
- Edit history is maintained securely to ensure data integrity

### Credential Handling

User credentials and authentication tokens are critical for maintaining the security of PHI:

- User authentication is managed through AWS Amplify
- Passwords are never stored in plain text
- Authentication tokens are securely stored and transmitted
- Token expiration and refresh mechanisms are implemented to enhance security
- Multi-factor authentication (MFA) is available for additional security

## Security Considerations

- All PHI data is encrypted both in transit and at rest
- Access to PHI is strictly controlled through user authentication and authorization
- Regular security audits are conducted to ensure compliance with HIPAA regulations
- Proper input validation and sanitization are implemented to prevent injection attacks
- HTTPS is used for all network communications
- Dependencies are regularly updated to patch security vulnerabilities
- Logging and monitoring are implemented to detect and respond to potential security incidents
- Proper data backup and recovery procedures are in place

## Deployment

The application is configured to be deployed using AWS Amplify CLI, ensuring a secure and scalable infrastructure. All necessary security measures are in place for a production environment. 

In the near future the front-end will be transfered to AWS Workspaces for a more secure and portable environment to lessen the risk for hardware based security compromises.

# AWS Backend Technical Documentation for ChiroNote

## Overview

ChiroNote utilizes various AWS services to create a secure, scalable, and compliant healthcare application. This document outlines the key components of our AWS infrastructure, focusing on data security, HIPAA compliance, and efficient operation.

## Lambda Functions

ChiroNote uses AWS Lambda, a serverless compute service, to run code without provisioning or managing servers. Our application utilizes ten Lambda functions for various backend processes:

1. **Transcript Generation**: Converts audio conversations into text transcripts.
2. **Note Creation and Streaming**: Transforms transcripts into formatted notes and streams them to the client.
3. **Stripe Checkout Redirect**: Manages secure payment processing through Stripe integration.
4. **Edit Instruction Processing**: Handles note modifications and updates.
5. **Amplify-Generated Function**: An auto-generated function supporting AWS Amplify operations.
6. **Stripe Webhook Handler**: Manages subscription events and changes.
7. **Subscription Table Creation**: Initializes DynamoDB tables for new user subscriptions.
8. **AssemblyAI Token Generation**: Securely generates tokens for dictation services.
9. **Monthly Credit Refill**: Automates the process of refreshing user credits based on subscription tiers.
10. **Feedback Email Generation**: Creates and sends user feedback emails via Amazon SES.

Lambda functions provide a high level of security as they are stateless and run in isolated environments. This isolation helps ensure that protected health information (PHI) is processed securely.

## Core AWS Services

### DynamoDB
Amazon DynamoDB is a fully managed NoSQL database service that provides fast and predictable performance with seamless scalability. ChiroNote uses two DynamoDB tables:

1. **Subscriptions Table**: Stores and manages user subscription data.
2. **Notes Table**: Securely stores user notes and associated metadata.

DynamoDB offers built-in security features, including encryption at rest, helping us maintain HIPAA compliance for stored PHI.

### Amazon S3 (Simple Storage Service)
S3 is an object storage service known for its durability, availability, and security. We use S3 to:

- Store production Amplify files
- Facilitate content delivery through CloudFront

S3 provides server-side encryption for data at rest and secure transfer of data in transit, crucial for protecting PHI.

### AWS CloudTrail
CloudTrail is a service that enables governance, compliance, operational auditing, and risk auditing of your AWS account. It logs, continuously monitors, and retains account activity related to actions across your AWS infrastructure, providing a comprehensive security and compliance solution.

### Amazon Cognito
Cognito provides authentication, authorization, and user management for web and mobile apps. It securely manages user pools for AWS Amplify, handling sign-up, sign-in, and access control. This service helps us maintain strict access controls for PHI.

### Amazon CloudWatch
CloudWatch is a monitoring and observability service that provides data and actionable insights for AWS applications. It monitors the performance and operational health of AWS services used in ChiroNote, helping us maintain high availability and performance.

### AWS Amplify
Amplify is the primary service hosting most of ChiroNote's application components. It simplifies the process of building scalable and secure cloud applications, providing a comprehensive way to handle authentication, API management, and hosting.

### Amazon CloudFront
CloudFront is a fast content delivery network (CDN) service that securely delivers data, videos, applications, and APIs to customers globally. Integrated with AWS Certificate Manager, it ensures secure and efficient delivery of ChiroNote to end-users.

### Amazon API Gateway
API Gateway creates, publishes, maintains, monitors, and secures APIs at any scale. It manages all non-functional URL Lambda integrations, providing a secure and scalable API layer for ChiroNote.

### AWS Identity and Access Management (IAM)
IAM enables secure management of access to AWS services and resources. It's used to control user and system access across the entire AWS platform for ChiroNote, ensuring that only authorized entities can access sensitive information.

### Amazon Simple Email Service (SES)
SES is a cloud-based email sending service designed to help digital marketers and application developers send marketing, notification, and transactional emails. In ChiroNote, it's responsible for sending initial sign-up emails and feedback communications.

### AWS AppSync
AppSync simplifies application development by letting you create a flexible API to securely access, manipulate, and combine data from one or more data sources. It manages GraphQL queries in ChiroNote, primarily handling note and transcript information throughout the application.

## Security and Compliance

- All data is encrypted at rest and in transit using industry-standard encryption protocols.
- Access to AWS resources is strictly controlled through IAM policies, adhering to the principle of least privilege.
- Regular security audits are conducted to ensure ongoing compliance with HIPAA regulations.
- CloudTrail provides comprehensive logging for security analysis, resource change tracking, and compliance auditing.

## Data Management and Backup

- S3 buckets are configured with versioning to protect against accidental deletions or overwrites.

## Monitoring and Logging

- Comprehensive CloudWatch dashboards provide real-time monitoring of all AWS services used in ChiroNote.
- Centralized logging using CloudWatch Logs enables easier troubleshooting and auditing.
- CloudTrail tracks user activity and API usage across the AWS account for security and compliance purposes.

This infrastructure is designed to provide a secure, scalable, and HIPAA-compliant environment for handling sensitive healthcare data. By leveraging these AWS services, ChiroNote ensures the protection and efficient management of Protected Health Information (PHI) while delivering a robust and reliable application to healthcare providers.