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
import { getUserSubscription } from "../graphql/queries";
import { updateUserSubscription } from "../graphql/mutations";
const client = generateClient();
export default function UserSubscriptionUpdateForm(props) {
  const {
    owner: ownerProp,
    userSubscription: userSubscriptionModelProp,
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
    tier: "",
    hoursleft: "",
    notesleft: "",
  };
  const [owner, setOwner] = React.useState(initialValues.owner);
  const [tier, setTier] = React.useState(initialValues.tier);
  const [hoursleft, setHoursleft] = React.useState(initialValues.hoursleft);
  const [notesleft, setNotesleft] = React.useState(initialValues.notesleft);
  const [errors, setErrors] = React.useState({});
  const resetStateValues = () => {
    const cleanValues = userSubscriptionRecord
      ? { ...initialValues, ...userSubscriptionRecord }
      : initialValues;
    setOwner(cleanValues.owner);
    setTier(cleanValues.tier);
    setHoursleft(cleanValues.hoursleft);
    setNotesleft(cleanValues.notesleft);
    setErrors({});
  };
  const [userSubscriptionRecord, setUserSubscriptionRecord] = React.useState(
    userSubscriptionModelProp
  );
  React.useEffect(() => {
    const queryData = async () => {
      const record = ownerProp
        ? (
            await client.graphql({
              query: getUserSubscription.replaceAll("__typename", ""),
              variables: { owner: ownerProp },
            })
          )?.data?.getUserSubscription
        : userSubscriptionModelProp;
      setUserSubscriptionRecord(record);
    };
    queryData();
  }, [ownerProp, userSubscriptionModelProp]);
  React.useEffect(resetStateValues, [userSubscriptionRecord]);
  const validations = {
    owner: [{ type: "Required" }],
    tier: [{ type: "Required" }],
    hoursleft: [{ type: "Required" }],
    notesleft: [],
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
          tier,
          hoursleft,
          notesleft: notesleft ?? null,
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
            query: updateUserSubscription.replaceAll("__typename", ""),
            variables: {
              input: {
                owner: userSubscriptionRecord.owner,
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
      {...getOverrideProps(overrides, "UserSubscriptionUpdateForm")}
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
              tier,
              hoursleft,
              notesleft,
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
        label="Tier"
        isRequired={true}
        isReadOnly={false}
        value={tier}
        onChange={(e) => {
          let { value } = e.target;
          if (onChange) {
            const modelFields = {
              owner,
              tier: value,
              hoursleft,
              notesleft,
            };
            const result = onChange(modelFields);
            value = result?.tier ?? value;
          }
          if (errors.tier?.hasError) {
            runValidationTasks("tier", value);
          }
          setTier(value);
        }}
        onBlur={() => runValidationTasks("tier", tier)}
        errorMessage={errors.tier?.errorMessage}
        hasError={errors.tier?.hasError}
        {...getOverrideProps(overrides, "tier")}
      ></TextField>
      <TextField
        label="Hoursleft"
        isRequired={true}
        isReadOnly={false}
        type="number"
        step="any"
        value={hoursleft}
        onChange={(e) => {
          let value = isNaN(parseFloat(e.target.value))
            ? e.target.value
            : parseFloat(e.target.value);
          if (onChange) {
            const modelFields = {
              owner,
              tier,
              hoursleft: value,
              notesleft,
            };
            const result = onChange(modelFields);
            value = result?.hoursleft ?? value;
          }
          if (errors.hoursleft?.hasError) {
            runValidationTasks("hoursleft", value);
          }
          setHoursleft(value);
        }}
        onBlur={() => runValidationTasks("hoursleft", hoursleft)}
        errorMessage={errors.hoursleft?.errorMessage}
        hasError={errors.hoursleft?.hasError}
        {...getOverrideProps(overrides, "hoursleft")}
      ></TextField>
      <TextField
        label="Notesleft"
        isRequired={false}
        isReadOnly={false}
        type="number"
        step="any"
        value={notesleft}
        onChange={(e) => {
          let value = isNaN(parseInt(e.target.value))
            ? e.target.value
            : parseInt(e.target.value);
          if (onChange) {
            const modelFields = {
              owner,
              tier,
              hoursleft,
              notesleft: value,
            };
            const result = onChange(modelFields);
            value = result?.notesleft ?? value;
          }
          if (errors.notesleft?.hasError) {
            runValidationTasks("notesleft", value);
          }
          setNotesleft(value);
        }}
        onBlur={() => runValidationTasks("notesleft", notesleft)}
        errorMessage={errors.notesleft?.errorMessage}
        hasError={errors.notesleft?.hasError}
        {...getOverrideProps(overrides, "notesleft")}
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
          isDisabled={!(ownerProp || userSubscriptionModelProp)}
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
              !(ownerProp || userSubscriptionModelProp) ||
              Object.values(errors).some((e) => e?.hasError)
            }
            {...getOverrideProps(overrides, "SubmitButton")}
          ></Button>
        </Flex>
      </Flex>
    </Grid>
  );
}
