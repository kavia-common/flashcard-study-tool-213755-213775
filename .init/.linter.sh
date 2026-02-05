#!/bin/bash
cd /home/kavia/workspace/code-generation/flashcard-study-tool-213755-213775/frontend_react
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

