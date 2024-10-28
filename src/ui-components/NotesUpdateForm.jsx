/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

/* eslint-disable */
import * as React from "react";
import { Button, Flex, Grid, TextField } from "@aws-amplify/ui-react";
import { fetchByPath, getOverrideProps, validateField } from "./utils";
import { generateClient } from "aws-amplify/api";
import { getNotes } from "../graphql/queries";
import { updateNotes } from "../graphql/mutations";
const client = generateClient();
export default function NotesUpdateForm(props) {
  const {
    id: idProp,
    notes: notesModelProp,
    onSuccess,
    onError,
    onSubmit,
    onValidate,
    onChange,
    overrides,
    ...rest
  } = props;
  const initialValues = {
    owner: "",
    timestamp: "",
    transcript: "",
    note: "",
  };
  const [owner, setOwner] = React.useState(initialValues.owner);
  const [timestamp, setTimestamp] = React.useState(initialValues.timestamp);
  const [transcript, setTranscript] = React.useState(initialValues.transcript);
  const [note, setNote] = React.useState(initialValues.note);
  const [errors, setErrors] = React.useState({});
  const resetStateValues = () => {
    const cleanValues = notesRecord
      ? { ...initialValues, ...notesRecord }
      : initialValues;
    setOwner(cleanValues.owner);
    setTimestamp(cleanValues.timestamp);
    setTranscript(cleanValues.transcript);
    setNote(cleanValues.note);
    setErrors({});
  };
  const [notesRecord, setNotesRecord] = React.useState(notesModelProp);
  React.useEffect(() => {
    const queryData = async () => {
      const record = idProp
        ? (
            await client.graphql({
              query: getNotes.replaceAll("__typename", ""),
              variables: { ...idProp },
            })
          )?.data?.getNotes
        : notesModelProp;
      setNotesRecord(record);
    };
    queryData();
  }, [idProp, notesModelProp]);
  React.useEffect(resetStateValues, [notesRecord]);
  const validations = {
    owner: [{ type: "Required" }],
    timestamp: [{ type: "Required" }],
    transcript: [],
    note: [],
  };
  const runValidationTasks = async (
    fieldName,
    currentValue,
    getDisplayValue
  ) => {
    const value =
      currentValue && getDisplayValue
        ? getDisplayValue(currentValue)
        : currentValue;
    let validationResponse = validateField(value, validations[fieldName]);
    const customValidator = fetchByPath(onValidate, fieldName);
    if (customValidator) {
      validationResponse = await customValidator(value, validationResponse);
    }
    setErrors((errors) => ({ ...errors, [fieldName]: validationResponse }));
    return validationResponse;
  };
  return (
    <Grid
      as="form"
      rowGap="15px"
      columnGap="15px"
      padding="20px"
      onSubmit={async (event) => {
        event.preventDefault();
        let modelFields = {
          owner,
          timestamp,
          transcript: transcript ?? null,
          note: note ?? null,
        };
        const validationResponses = await Promise.all(
          Object.keys(validations).reduce((promises, fieldName) => {
            if (Array.isArray(modelFields[fieldName])) {
              promises.push(
                ...modelFields[fieldName].map((item) =>
                  runValidationTasks(fieldName, item)
                )
              );
              return promises;
            }
            promises.push(
              runValidationTasks(fieldName, modelFields[fieldName])
            );
            return promises;
          }, [])
        );
        if (validationResponses.some((r) => r.hasError)) {
          return;
        }
        if (onSubmit) {
          modelFields = onSubmit(modelFields);
        }
        try {
          Object.entries(modelFields).forEach(([key, value]) => {
            if (typeof value === "string" && value === "") {
              modelFields[key] = null;
            }
          });
          await client.graphql({
            query: updateNotes.replaceAll("__typename", ""),
            variables: {
              input: {
                owner: notesRecord.owner,
                timestamp: notesRecord.timestamp,
                ...modelFields,
              },
            },
          });
          if (onSuccess) {
            onSuccess(modelFields);
          }
        } catch (err) {
          if (onError) {
            const messages = err.errors.map((e) => e.message).join("\n");
            onError(modelFields, messages);
          }
        }
      }}
      {...getOverrideProps(overrides, "NotesUpdateForm")}
      {...rest}
    >
      <TextField
        label="Owner"
        isRequired={true}
        isReadOnly={true}
        value={owner}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              owner: value,
              timestamp,
              transcript,
              note,
            };
            const result = onChange(modelFields);
            value = result?.owner ?? value;
          }
          if (errors.owner?.hasError) {
            runValidationTasks("owner", value);
          }
          setOwner(value);
        }}
        onBlur={() => runValidationTasks("owner", owner)}
        errorMessage={errors.owner?.errorMessage}
        hasError={errors.owner?.hasError}
        {...getOverrideProps(overrides, "owner")}
      ></TextField>
      <TextField
        label="Timestamp"
        isRequired={true}
        isReadOnly={true}
        value={timestamp}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              owner,
              timestamp: value,
              transcript,
              note,
            };
            const result = onChange(modelFields);
            value = result?.timestamp ?? value;
          }
          if (errors.timestamp?.hasError) {
            runValidationTasks("timestamp", value);
          }
          setTimestamp(value);
        }}
        onBlur={() => runValidationTasks("timestamp", timestamp)}
        errorMessage={errors.timestamp?.errorMessage}
        hasError={errors.timestamp?.hasError}
        {...getOverrideProps(overrides, "timestamp")}
      ></TextField>
      <TextField
        label="Transcript"
        isRequired={false}
        isReadOnly={false}
        value={transcript}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              owner,
              timestamp,
              transcript: value,
              note,
            };
            const result = onChange(modelFields);
            value = result?.transcript ?? value;
          }
          if (errors.transcript?.hasError) {
            runValidationTasks("transcript", value);
          }
          setTranscript(value);
        }}
        onBlur={() => runValidationTasks("transcript", transcript)}
        errorMessage={errors.transcript?.errorMessage}
        hasError={errors.transcript?.hasError}
        {...getOverrideProps(overrides, "transcript")}
      ></TextField>
      <TextField
        label="Note"
        isRequired={false}
        isReadOnly={false}
        value={note}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              owner,
              timestamp,
              transcript,
              note: value,
            };
            const result = onChange(modelFields);
            value = result?.note ?? value;
          }
          if (errors.note?.hasError) {
            runValidationTasks("note", value);
          }
          setNote(value);
        }}
        onBlur={() => runValidationTasks("note", note)}
        errorMessage={errors.note?.errorMessage}
        hasError={errors.note?.hasError}
        {...getOverrideProps(overrides, "note")}
      ></TextField>
      <Flex
        justifyContent="space-between"
        {...getOverrideProps(overrides, "CTAFlex")}
      >
        <Button
          children="Reset"
          type="reset"
          onClick={(event) => {
            event.preventDefault();
            resetStateValues();
          }}
          isDisabled={!(idProp || notesModelProp)}
          {...getOverrideProps(overrides, "ResetButton")}
        ></Button>
        <Flex
          gap="15px"
          {...getOverrideProps(overrides, "RightAlignCTASubFlex")}
        >
          <Button
            children="Submit"
            type="submit"
            variation="primary"
            isDisabled={
              !(idProp || notesModelProp) ||
              Object.values(errors).some((e) => e?.hasError)
            }
            {...getOverrideProps(overrides, "SubmitButton")}
          ></Button>
        </Flex>
      </Flex>
    </Grid>
  );
}
