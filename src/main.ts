/*
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { getInput, warning as logWarning, setFailed, setOutput, setSecret } from '@actions/core';
import { Client } from './client';
import { Reference } from './reference';

/**
 * Accepts the actions list of secrets and parses them as References.
 *
 * @param secretsInput List of secrets, from the actions input, can be
 * comma-delimited or newline, whitespace around secret entires is removed.
 * @returns Array of References for each secret, in the same order they were
 * given.
 */
function parseSecretsRefs(secretsInput: string): Reference[] {
  const secrets = new Array<Reference>();
  for (const line of secretsInput.split(`\n`)) {
    for (const piece of line.split(',')) {
      secrets.push(new Reference(piece.trim()));
    }
  }
  return secrets;
}

/**
 * Executes the main action. It includes the main business logic and is the
 * primary entry point. It is documented inline.
 */
async function run(): Promise<void> {
  try {
    // Fetch the list of secrets provided by the user.
    const secretsInput = getInput('secrets', { required: true });

    // Get credentials, if any.
    const credentials = getInput('credentials');

    // Add warning if using credentials
    if (credentials) {
      logWarning(
        '"credentials" input has been deprecated. ' +
          'Please switch to using google-github-actions/auth which supports both Workload Identity Federation and JSON Key authentication. ' +
          'For more details, see https://github.com/google-github-actions/get-secretmanager-secrets#authorization',
      );
    }

    // Create an API client.
    const client = new Client({
      credentials: credentials,
    });

    // Parse all the provided secrets into references.
    const secretsRefs = parseSecretsRefs(secretsInput);

    // Access and export each secret.
    for (const ref of secretsRefs) {
      const value = await client.accessSecret(ref.selfLink());

      // Split multiline secrets by line break and mask each line.
      // Read more here: https://github.com/actions/runner/issues/161
      // value.split(/\r\n|\r|\n/g).forEach((line) => setSecret(line));

      setOutput(ref.output, value);
    }
  } catch (err) {
    setFailed(`google-github-actions/get-secretmanager-secrets failed with: ${err}`);
  }
}

run();
