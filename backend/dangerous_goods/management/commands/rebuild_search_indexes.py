# dangerous_goods/management/commands/rebuild_search_indexes.py
from django.core.management.base import BaseCommand
from django_elasticsearch_dsl.management.commands.search_index import Command as SearchIndexCommand
from django_elasticsearch_dsl import Index

class Command(BaseCommand):
    help = 'Rebuild all Elasticsearch indexes for SafeShipper'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force rebuild even if indexes exist',
        )
        parser.add_argument(
            '--models',
            nargs='+',
            help='Specific models to rebuild (dangerous_goods, documents, manifests)',
            default=['dangerous_goods', 'documents', 'manifests']
        )

    def handle(self, *args, **options):
        force = options['force']
        models = options['models']
        
        self.stdout.write(
            self.style.SUCCESS('Starting Elasticsearch index rebuild...')
        )
        
        # Available indexes
        index_mapping = {
            'dangerous_goods': 'dangerous_goods',
            'documents': 'documents', 
            'manifests': 'manifests',
            'manifest_items': 'manifest_items',
        }
        
        for model_name in models:
            if model_name == 'dangerous_goods':
                self._rebuild_index('dangerous_goods', force)
            elif model_name == 'documents':
                self._rebuild_index('documents', force)
            elif model_name == 'manifests':
                self._rebuild_index('manifests', force)
                self._rebuild_index('manifest_items', force)
        
        self.stdout.write(
            self.style.SUCCESS('✓ Elasticsearch index rebuild completed!')
        )

    def _rebuild_index(self, index_name, force=False):
        """Rebuild a specific index"""
        try:
            self.stdout.write(f'Rebuilding {index_name} index...')
            
            # Delete existing index if force is True
            if force:
                try:
                    index = Index(index_name)
                    index.delete(ignore=404)
                    self.stdout.write(f'  - Deleted existing {index_name} index')
                except Exception as e:
                    self.stdout.write(
                        self.style.WARNING(f'  - Could not delete {index_name}: {e}')
                    )
            
            # Create and populate index
            search_cmd = SearchIndexCommand()
            search_cmd.handle(
                action='create',
                models=[index_name],
                verbosity=1,
            )
            
            search_cmd.handle(
                action='populate',
                models=[index_name],
                verbosity=1,
            )
            
            self.stdout.write(
                self.style.SUCCESS(f'  ✓ {index_name} index rebuilt successfully')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'  ✗ Failed to rebuild {index_name}: {e}')
            )