import { handler } from "../index.mjs";
import * as module from "../common.functions.mjs";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

jest.mock("@aws-sdk/client-dynamodb");
jest.mock("@aws-sdk/lib-dynamodb");
jest.mock("../common.functions.mjs");
const mockSend = jest.fn();
DynamoDBClient.prototype.send = mockSend;

describe("User Login Handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test("1 - Successful Login", async () => {
    const mockRequestJSON = {
      mobile: "8770800000",
    };

    const inputEvent = {
      version: "2.0",
      routeKey: "POST /user-onboarding",
      rawPath: "/dev/user-onboarding",
      rawQueryString: "",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mockRequestJSON),
      isBase64Encoded: false,
    };

    // Mocking DynamoDBDocumentClient.from
    jest
      .spyOn(DynamoDBDocumentClient, "from")
      .mockReturnValue({ send: jest.fn() });
    // Mocking DynamoDBDocumentClient send method
    mockSend.mockResolvedValueOnce({
      $metadata: {
        httpStatusCode: 200,
        requestId: "76FLPPGD9399Q2UU9OCE5TO5F7VV4KQNSO5AEMVJF66Q9ASUAAJG",
        extendedRequestId: undefined,
        cfId: undefined,
        attempts: 1,
        totalRetryDelay: 0,
      },
      Item: {
        lastname: { S: "Jain" },
        mobile: { N: "8770800000" },
        name: { S: "Rahul" },
        usertype: { S: "passenger" },
      },
    });
    jest.spyOn(module, "generateOTP").mockReturnValue(1234);
    jest.spyOn(module, "storeOtp").mockReturnValue(true);
    const result = await handler(inputEvent);

    const expectedResponse = {
      body: JSON.stringify({
        message:
          "OTP is 1234, Use this OTP to Authenticate yourself. OTP valid for 10 minutes",
      }),
      statusCode: 200,
    };

    expect(result).toEqual(expectedResponse);
  });
  test("2 - Unsuccessful Login - User Not Found", async () => {
    const mockRequestJSON = {
      mobile: "8765432100", // Use a mobile number that doesn't exist in the database
    };

    const inputEvent = {
      version: "2.0",
      routeKey: "POST /user-onboarding",
      rawPath: "/dev/user-onboarding",
      rawQueryString: "",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mockRequestJSON),
      isBase64Encoded: false,
    };

    // Mocking DynamoDBDocumentClient.from
    jest
      .spyOn(DynamoDBDocumentClient, "from")
      .mockReturnValue({ send: jest.fn() });

    // Mocking DynamoDBDocumentClient send method
    mockSend.mockResolvedValueOnce({
      $metadata: {
        httpStatusCode: 200,
        requestId: "76FLPPGD9399Q2UU9OCE5TO5F7VV4KQNSO5AEMVJF66Q9ASUAAJG",
        extendedRequestId: undefined,
        cfId: undefined,
        attempts: 1,
        totalRetryDelay: 0,
      },
      Item: null, // Simulate that the user doesn't exist in the database
    });

    const result = await handler(inputEvent);

    const expectedResponse = {
      body: JSON.stringify({
        error: "User not found, Please register to Canada Taxi",
      }),
      statusCode: 404,
    };

    expect(result).toEqual(expectedResponse);
  });
  test("3 - should handle error in DynamoDB operation", async () => {
    // Arrange
    const mockRequestJSON = {
      mobile: "1234567890",
    };

    const inputEvent = {
      body: JSON.stringify(mockRequestJSON),
    };

    const mockDynamoDBClient = new DynamoDBClient({});
    const mockError = new Error("Simulated error in DynamoDB operation");

    jest.spyOn(mockDynamoDBClient, "send").mockRejectedValueOnce(mockError);

    // Act & Assert
    await expect(handler(inputEvent)).rejects.toThrowError(mockError);
  });
});
