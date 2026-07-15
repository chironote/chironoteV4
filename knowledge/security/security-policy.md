---
type: security-policy
title: "Company Security Policy"
description: "Draft company security policy, HIPAA safeguard notes, risk considerations, and AWS service inventory."
resource: "../../security_documentation.md"
tags: [chironote, security, hipaa, policy, draft]
---


> Source: [`security_documentation.md`](../../security_documentation.md)

# Company Security Policy

## 1. Introduction

This document outlines the security measures implemented by ChiroNote to protect Electronic Protected Health Information (ePHI) in accordance with the Health Insurance Portability and Accountability Act (HIPAA) Security Rule, specifically the "Security Standards for the Protection of Electronic Protected Health Information" found at 45 CFR Part 160 and Part 164, Subparts A and C.

## 2. Definitions

### 2.1 Protected Health Information (PHI)

As defined in 45 CFR Â§ 160.103, PHI includes individually identifiable health information transmitted or maintained in electronic media. In the context of ChiroNote, while the content in the web application is certainly PHI, it is considered low risk due to the omission of most specific information that can lead to patient identification, particularly the absence of demographic data.

### 2.2 Covered Entity

[Define what constitutes a covered entity under the terms and conditions of ChiroNote]

## 3. Safeguard Requirements

In accordance with 45 CFR Â§ 164.530(c), ChiroNote implements the following safeguards:

### 3.1 Access Control

[Describe access control measures]

### 3.2 Encryption

[Detail encryption methods used]

### 3.3 Audit Procedures

[Outline audit procedures]

## 4. Administrative Safeguards (45 CFR Â§ 164.308)

ChiroNote implements administrative actions, policies, and procedures to manage the selection, development, implementation, and maintenance of security measures to protect ePHI and to manage the conduct of the covered entity's workforce in relation to the protection of that information.

### 4.1 Risk Analysis (Required)

1. Lost usernames and passwords
2. Cross-site hacks
3. Doctor screen vulnerabilities

### 4.2 Risk Management (Required)

1. No long-term storage of PHI
2. Limited storage of PHI (Dictation and Edits are excluded)

### 4.3 Sanction Policy (Required)

[Describe appropriate sanctions in a one-person firm]

### 4.4 Information System Activity Review (Required)

[Detail the review process for information system activity]

### 4.5 Security Reminders (Addressable)

[Describe security reminder procedures]

### 4.6 Protection from Malicious Software (Addressable)

[Outline measures to protect against malicious software]

### 4.7 Log-in Monitoring (Addressable)

- Monitoring of unsuccessful login attempts

### 4.8 Password Management (Addressable)

[Detail password management policies]

## 5. Disaster Recovery Plan

ChiroNote does not implement a disaster recovery plan for PHI. This is a productivity tool and is not designed for long-term storage of medical information. While the inconvenience to covered entities using the application is regrettable, it is not the responsibility of this software to store critical medical information. Attempts to create such back-ups would only hinder the existing security of the limited PHI available to the software due to creating unnecessary duplicates and sources of PHI.

## 6. Emergency Mode Operation

Emergency mode operation does not apply to ChiroNote.

## 7. Technical Safeguards (45 CFR Â§ 164.312)

[Detail technical safeguards implemented]

## 8. Physical Safeguards (45 CFR Â§ 164.310)

[Outline physical safeguards in place]

## 9. Security Rule Compliance

ChiroNote's compliance with the Security Rule takes into account the following factors as per Â§ 164.306(b)(2):

### 9.1 Size, Complexity, and Capabilities

ChiroNote is a sole owner LLC, resulting in a simplified worker structure. The owner and CTO are the same individual, so educational and administrative guidelines are primarily aimed at subcontractors tasked with modifying the code. These entities are given access to the AWS platform with their own credentials that do not allow them to view the ePHI directly.

Currently, no entities with direct access to PHI exist except the owner and the doctors with access to their own notes. Should additional personnel be hired, their login credentials will constitute the minimum necessary to accomplish the given task and are unlikely to contain access to the DynamoDB data tables containing the actual PHI. The primary security risk lies in access to code, and changes will be reviewed for security compromises.

### 9.2 Technical Infrastructure

All infrastructure belongs to associates as outlined in the Business Associate Agreements (BAA). The owner's hardware is only used to implement front-end changes.

### 9.3 Costs of Security Measures

[Detail considerations regarding the costs of security measures]

### 9.4 Probability and Criticality of Potential Risks

The main risk is compromised user login credentials, which is primarily addressed by the User Terms and Conditions.

## 10. Conclusion

[Summarize key points and commitment to ongoing security improvements]

## 11. AWS Services

### 11.1 Lambda Functions

ChiroNote utilizes ten Lambda functions for various operations:

#### 11.1.1 Transcript Generation
[Details on how this function generates a transcript based on the conversation]

#### 11.1.2 Note Creation and Streaming
[Explanation of how this function turns the transcript into a note and streams it back]

#### 11.1.3 Stripe Checkout Redirect
[Description of the function that handles the redirect to Stripe checkout]

#### 11.1.4 Edit Instructions Processing
[Details on how this function converts edit instructions and streams it back as a note to the clipboard]

#### 11.1.5 Amplify-generated Function
[Description of this Amplify-generated Lambda function]

#### 11.1.6 Stripe Webhook Handler
[Explanation of how this function handles subscription events changes]

#### 11.1.7 DynamoDB Subscription Table Creation
[Details on how this function creates a subscription DynamoDB table upon sign up]

#### 11.1.8 AssemblyAI Token Generation
[Description of how this function generates an AssemblyAI token to authorize the dictation]

#### 11.1.9 Monthly Credit Refill
[Explanation of how this function manages monthly credit refill for various subscription tiers]

#### 11.1.10 Feedback Email Generation
[Details on how this function generates the feedback email from incentive via Simple Email Service]

### 11.2 DynamoDB

ChiroNote uses two DynamoDB tables:

#### 11.2.1 User Subscriptions Table
[Description of the table handling user subscriptions]

#### 11.2.2 Notes Table
[Explanation of the table handling notes]

### 11.3 S3 Bucket

[Details on how the S3 bucket holds production Amplify files for CloudFront access]

### 11.4 CloudTrail

[Explanation of how CloudTrail monitors logging events for security]

### 11.5 Cognito

[Description of how Cognito handles the user pool for Amplify]

### 11.6 CloudWatch

[Details on how CloudWatch monitors the function of various components]

### 11.7 AWS Amplify

[Explanation of Amplify's role as the main component holding most of the app]

### 11.8 CloudFront

[Description of how CloudFront exports it to ChiroNote.ai using AWS Certificate Manager]

### 11.9 API Gateway

[Explanation of how API Gateway is used in all non-functional URLs, lambdas]

### 11.10 IAM

[Details on how IAM handles all user access for the entire AWS platform]

### 11.11 Amazon Simple Email Services

[Description of how SES handles initial sign-up emails and feedback]

### 11.12 AppSync

The GraphQL schema is set to auth:owner, therefore the application by it's very structure only allows the user to see any notes or transcripts belonging to them.

## Provenance

Derived from [`security_documentation.md`](../../security_documentation.md).

