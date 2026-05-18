import { generateClient } from 'aws-amplify/api';

let client;

export const getAmplifyClient = () => {
  if (!client) {
    client = generateClient();
  }

  return client;
};
