import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface BaseStackProps extends cdk.StackProps {
  readonly stage: string;
  readonly projectName: string;
}

export class BaseStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id, props);

    // SSM Parameters for cross-stack references
    this.createSsmParameter('Stage', props.stage);
    this.createSsmParameter('ProjectName', props.projectName);
  }

  protected createSsmParameter(name: string, value: string): cdk.aws_ssm.StringParameter {
    return new cdk.aws_ssm.StringParameter(this, `${name}Parameter`, {
      parameterName: `/${this.stackName}/${name}`,
      stringValue: value,
      tier: cdk.aws_ssm.ParameterTier.STANDARD,
      description: `${name} for ${this.stackName}`,
    });
  }

  protected importSsmParameter(stackName: string, name: string): string {
    return cdk.aws_ssm.StringParameter.valueForStringParameter(
      this,
      `/${stackName}/${name}`
    );
  }

  protected createOutput(id: string, value: string, description: string, exportName?: string): cdk.CfnOutput {
    return new cdk.CfnOutput(this, id, {
      value,
      description,
      exportName: exportName || `${this.stackName}-${id}`,
    });
  }
}
