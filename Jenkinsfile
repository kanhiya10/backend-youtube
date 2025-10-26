pipeline {
  agent any

  environment {
    DOCKERHUB_CREDS = credentials('dockerhub-credentials')
    IMAGE_NAME = "kanhiya693/ec2_repo"
    IMAGE_TAG = "backend-prod-v1"
    DEPLOY_DIR = "/workspace"
  }

  stages {
    stage('Checkout') {
      steps {
        dir('/workspace/backend-youtube') {
          git branch: 'featureBranch', url: 'https://github.com/kanhiya10/backend-youtube.git'
        }
      }
    }

    stage('Build & Push Docker Image') {
      steps {
        dir('/workspace/backend-youtube') {
          sh '''
            echo "Building Docker image..."
            docker build -t $IMAGE_NAME:$IMAGE_TAG .
            echo "$DOCKERHUB_CREDS_PSW" | docker login -u "$DOCKERHUB_CREDS_USR" --password-stdin
            docker push $IMAGE_NAME:$IMAGE_TAG
          '''
        }
      }
    }

    stage('Deploy Backend') {
      steps {
        dir("$DEPLOY_DIR") {
          sh '''
            docker-compose pull backend
            docker rm -f backend || true
            docker-compose up -d --force-recreate backend
          '''
        }
      }
    }
  }
}
