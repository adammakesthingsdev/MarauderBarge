# MarauderBarge
## Introduction
Welcome to MarauderBarge! MarauderBarge is my take at a full-featured shipping API and interface, specifically designed and customized for Hack Club's Mail Team suite. The design goal was to imitate the feature set of PirateShip, a free international shipping service with good pricing but a lot of caveats, including no publically accessable API. It further extends to add additional functionality like seperate printing nodes, a centralized and authenticated nodemaster, automatic printing, address validation, and more.

**Please note that MarauderBarge is at this time a major work in progress, and not all features listed are implemented or finished.**

## Structural overview
MarauderBarge is a fairly specific use case system, and as such has a fairly complex system map. Sticking to the seafaring theme of PirateShip, some elements of MarauderBarge have aquatic-themed terminology. End nodes (the servers that print labels) are referred to as "dinghies", while their controlling nodemaster is the "frigate". 
### Frigate
The most important part is the **frigate**, as it controls all of its subsystems. The frigate is ideally hosted on a permanent local server for security reasons. It hosts the logic for recieving a request, authenticating it, purchasing the label, determining the optimal dinghy, and returning a response to the requester.
### Dinghy
The **dinghy** is under the direct command of the frigate, but by itself doesn't have much logic. After getting a request to print from its commanding frigate, it will exchange authentication information and print the label. It will also report back any errors to the frigate, so if something goes wrong it can simply choose another dinghy. Each dinghy is responsible for a single printer, but the edge server hosting dinghies (a "**raft**") can have as many dinghy instances as there are local printers.

## Technical details
The entire system is written in TypeScript with as strict typing as possible. It's designed such that the codebase is the same for both frigate and dinghy, and the only difference is which file is deployed. This does not impact security - deployers should only put the required credentials for each system type in the environment variables.
In addition, everything is designed to be as modular and configurable as possible - not only can each module be used by itself (i.e. printing functionality), but many changes can be made very easily by setting values in a configuration file. Adding a dinghy should be as simple as filling out a few basic details like its name and IP.

## Filestructure
* **config/** | *Configuration folder*
  * default.json | *Main configuration. Rename "default-SAMPLE.json" to get started!*
* dist/ | *Build location for js / map files*
* node_modules/ | *External modules*
* **src/** | *Main TypeScript files*
  * **apiwrapper.ts** | *REST API wrapper for frigate*
  * **labelapi.ts** | *Label purchasing / rate finding*
  * **print.ts** | *Local label printing / print utils*
  * **test.ts** | *Test file. It's jank.*
* **.env** | *Environment variables for sensitive information*
* **.gitignore** | *Ignore tracking of sensitive information*
* creds.json | *Google API credentials file for frigate only*
* **package-lock.json** | *Package information*
* **package.json** | *Package information and build scripts*
* **README.MD** | *This file! Current docs*
* **tsconfig.json** | *Typescript configuration and linting options*

*Non-bolded items have been .gitignored for security/irrelevance

## Current / planned features
| Feature                                              | Current state |
| ---------------------------------------------------- | ------------- |
| Printing                                             | Done          |
| Rate query                                           | Done          |
| Purchase label                                       | Done          |
| Fully configurable                                   | In progress   |
| Get best rate                                        | In progress   |
| Fully typed                                          | In progress   |
| Frigate REST API                                     | In progress   |
| Authentication scheme                                | To do         |
| Frigate/dinghy seperation                            | To do         |
| Frigate/dinghy communication protocol                | To do         |
| Frigate frontend                                     | To do         |
| Detailed deployment instructions/setup               | To do         |
| Full Mail Team integration                           | To do         |
| Multiple dinghy instances in a raft / containerizing | To do         |

## Install / deploy instructions
**Until the seperation of frigates and dinghies is finished, do all of this on the same machine!**
* Setup the project basics:
  * Clone this repo to a folder with `git clone https://github.com/adammakesthingsdev/MarauderBarge` and `cd MarauderBarge`.
  * Make sure node is installed, then run `npm install`
  * For both frigate and dinghy deployments, change *config/default-SAMPLE.json* to *config/default.json*. You'll configure it later.
* Setup address validation (frigate only!):
  * Visit the [Google Cloud console](https://console.cloud.google.com/) and create an account if you don't have one. Follow the prompts.
  * Create a new project, following the prompts to add a billing account. If you don't have one, you'll need to verify your card with Google.
  * Enable the [Address Validation API](https://console.cloud.google.com/apis/library/addressvalidation.googleapis.com)
  * Go to your project's [Credentials page](https://console.cloud.google.com/apis/credentials), click "Create credentials", and follow the prompts to create a service account
  * Create a key for the service account, and choose to download it as a JSON
  * Move the file to the main project folder, and rename to *creds.json.* 
* Configure ShipEngine (frigate only!):
  * Create a [ShipEngine account](https://www.shipengine.com/signup/)
  * Go to the Dashboard, click "Environment" at the top, and change to either Production or Sandbox depending on whether you're testing or not.
  * Create an API key if you need to, and configure all carriers as you wish. Sandbox or not, copy the carrier code of the one you'd like to use. If you're testing and unsure, use "Stamps.com".
  * Fill in the carrier ID in *config/default.json*. Ignore the dinghy settings!
  * Add your API key to .env as `SHIPENGINE_API`.
* Connect your printer (dinghies only!):
  * Make sure your printer is IPP-capable. The easiest way to do this if it isn't is to install CUPS. You're on your own there, may the odds be ever in your favour.
  * Edit *config/default.json* with your printer's IP address - in cups, this is literally just the URL of the printer's page. Ignore the frigate settings!
* Final steps (dinghies and frigates):
  * Build the project with `npm run build`
  * Run the test file with `npm run ship`. If all goes well, you should have a sample label printed!
  * Catch your breath. You're finally safe from Shia Labeouf.