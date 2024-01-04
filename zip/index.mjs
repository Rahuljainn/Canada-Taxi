import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { generateOTP, storeOtp } from "./common.functions.mjs";

const TABLE_USER = "user-data";

async function isUserExists(mobile, clientdb) {
  console.log("mobile ", mobile);
  try {
    const input = {
      TableName: TABLE_USER,
      Key: {
        mobile: { N: mobile },
      },
    };
    console.log("dynamodb input ", input);
    const command = new GetItemCommand(input);
    const response = await clientdb.send(command);
    console.log("dynamodb single user ", response);
    return response?.Item ? true : false;
  } catch (error) {
    console.log("error in get single user ", error);
    throw error;
  }
}

export const handler = async (event) => {
  try {
    const clientdb = new DynamoDBClient({});
    const clientdoc = DynamoDBDocumentClient.from(clientdb);
    const { body } = event;
    console.log(`${JSON.stringify(event)}`);
    const { mobile } = JSON.parse(body);
    // Check if the user exists
    const userExists = await isUserExists(mobile.toString(), clientdb);
    console.log("userExists", userExists);
    if (userExists) {
      console.log(`If user exists`);
      const otp_gen = generateOTP();
      console.log(`OTP for ${mobile}: ${otp_gen}`);
      // Storing otp
      const result = await storeOtp(mobile, otp_gen, clientdoc);
      if (result) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            message:
              "OTP is " +
              otp_gen +
              ", Use this OTP to Authenticate yourself. OTP valid for 10 minutes",
          }),
        };
      }
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: "User not found, Please register to Canada Taxi",
        }),
      };
    }
  } catch (error) {
    console.error("Error in DynamoDB operation: ", error);
    throw error;
  }
};
