This is an example project to toy around with AWS's API Gateway. 

To invoke a secured route, you must pass the authentication token as
a part of the authorization header.

- It is important to mark the routes as private so that the API Keys are used


### Demo

#### Creating an API Key

1. First we'll need to create an API Key. This can be done using the command

`aws apigateway create-api-key --name 'API Key for Tenant "example"' --enabled`

which will return the output.

```json
{
  "id": "6oeivbs4oa",
  "value": "550C8wkd8i5tv2dgux1QGaEW92vaT6sf2Ec9u8bl",
  "name": "API Key for Tenant \"example\"",
  "enabled": true,
  "createdDate": "2024-05-18T14:06:09+05:30",
  "lastUpdatedDate": "2024-05-18T14:06:09+05:30",
  "stageKeys": []
}
```

In this example, the API Key is automatically generated but we
can specify one ourselves too.

I would suggest using the tenant-id as the API Key. As the API Key isn't
used for authentication, it is perfectly fine to use an understandable
tenant id.

Once the API Key has been created, we need to associate with a usage plan.
The project creates two usage plans—the first is an unlimited usage plan,
and the other is a general usage plan. This is just an example, and these
two will suffice. In production, you can have as many as needed.

To associate the API Key with the "General" usage plan, we first
need to get the id using

```
aws apigateway get-usage-plans --query 'items[?name==`General`].id | [0]' --output text --no-cli-pager
```

Once we have the identifier of the usage plan, we can associate the API Key
with the usage plan using the following command.

```
aws apigateway create-usage-plan-key --usage-plan-id '0ffx3i' --key-id '6oeivbs4oa' --key-type 'API_KEY'
```

Since we use a custom authorizer, we'll need to create a record for this in
DynamoDB.

```
token=$(openssl rand -base64 32)
hashed_token=$(echo -n $token | openssl dgst -sha256 | sed 's/^.* //')
aws dynamodb put-item --table-name Tokens --item "{\"token\": {\"S\": \"$hashed_token\"}, \"clientId\": {\"S\": \"550C8wkd8i5tv2dgux1QGaEW92vaT6sf2Ec9u8bl\"}}"
echo "Original token used for hashing: $token"
```

X34j/csq5LbbCoIlZ/yQxaaj7LGHipRd+2yKL+HfGKU=

If this is done, you should be able to invoke the API via CURL. To test a
successful request use,

```
curl -v -X GET 'https://ukgedldd50.execute-api.us-east-1.amazonaws.com/dev/health' -H 'Authorization: pasds'
```

### Todo

* Add a custom domain to the gateway
* Create a dashboard to see the number or requests.
* Create anomaly detection alarms to alert based on increased 5xx response codes.
* Deploy and OpenAPI based API Gateway.

### Caveats

* There is a hard limit of 10000 unique API Keys. Since we are using 
API Keys to identify tenants, we can only have 10,000 tenants.
* Since we one API Keys per tenant, this means that the rate limits are
on the tenant level.
  This means that if you need increased rate limits for a tenant, you
would need to attach a different usage plan to the key.

* Unable to see the metrics by tenantId
* All requests are logged but the request and responses are not logged.
  There is no plan to support this either.
  It should be possible to do this via the Lambda proxy integration but
considering the complexity, it makes sense to do this via the application.
  If request and response logging is needed for debugging purposes,
I recommend building this on the application.

### Result

API Gateway seems to be a solid choice for most use cases if you're coupled
to AWS.

As with most tier-2 AWS products, API Gateway feels a little clunky, but if
you're willing to compromise, it seems like a good fit.

If you're using EKS, I would really consider something else like Kong or Apisix.
